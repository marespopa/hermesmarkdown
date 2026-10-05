import { atom } from "jotai";
import { atom_openFiles, atom_liveHandles } from "./file-atoms";
import { atom_workspaceLayout } from "./workspace-atoms";
import { atom_fileTreeExpansion, atom_homePins } from "./ui-atoms";
import { atom_fileMetadata } from "./metadata";
import { atom_revealedSensitivePaths } from "./privacy-atoms";
import { reconcileWithDisk } from "@/app/hooks/file-system/reconcile-disk";
import { remapNoteContent } from "@/app/services/content-search-client";
import { remapPath, remapPathsInLayout, removePathsFromLayout } from "./utils";
import type { GitHubVaultDescriptor } from "@/app/services/github-vault-workspace";
import type { BrowserVaultDescriptor } from "@/app/services/opfs";
import type { RecentVault } from "@/app/services/recent-vaults";

// Vault / Local File System
export const atom_vaultHandle = atom<FileSystemDirectoryHandle | null>(null);
export const atom_currentDirectoryHandle =
  atom<FileSystemDirectoryHandle | null>(null);

export const atom_vaultFiles = atom<FileSystemHandle[]>([]);
export const atom_isVaultPending = atom<boolean>(false);
export const atom_hasLoadedVault = atom<boolean>(false);
// True until the saved vault's permission is known on startup: the editor
// and home feed stay hidden, and drafts aren't saved, until then.
export const atom_isVaultRestoring = atom<boolean>(true);
// True from the moment access is granted again until the vault is scanned and
// "Vault restored" shows; the route stays behind the overlay until then.
export const atom_isVaultUnlocking = atom<boolean>(false);
export const atom_isCloudVault = atom<boolean>(false);
export const atom_fileSystemVersion = atom<number>(0);

export type VaultDescriptor =
  | { kind: "local" }
  | BrowserVaultDescriptor
  | GitHubVaultDescriptor;

export const atom_vaultDescriptor = atom<VaultDescriptor | null>(null);

// Vaults opened on this device, most recent first (the open one included).
// Loaded from and saved to IndexedDB by useRecentVaultTracker.
export const atom_recentVaults = atom<RecentVault[]>([]);

// Stable per-vault key for UI state persisted across reloads.
export const atom_vaultKey = atom<string | null>((get) => {
  const descriptor = get(atom_vaultDescriptor);
  if (descriptor?.kind === "browser") return `browser:${descriptor.id}`;
  if (descriptor?.kind === "github") {
    return `github:${descriptor.owner}/${descriptor.repository}@${descriptor.branch}`;
  }
  const vaultHandle = get(atom_vaultHandle);
  return vaultHandle ? `local:${vaultHandle.name}` : null;
});

// Walks a vault-relative path to a fresh file handle. Throws the underlying
// DOMException (e.g. NotFoundError) when any segment is missing.
export async function resolveFileHandleAtPath(
  vaultHandle: FileSystemDirectoryHandle,
  path: string,
): Promise<FileSystemFileHandle> {
  const parts = path.split("/");
  let current = vaultHandle;
  for (let i = 0; i < parts.length - 1; i++) {
    current = await current.getDirectoryHandle(parts[i]);
  }
  return current.getFileHandle(parts[parts.length - 1]);
}

// Action atoms
export const atom_rebindHandles = atom(
  null,
  async (get, set, vaultHandle: FileSystemDirectoryHandle) => {
    const openFiles = get(atom_openFiles);
    const paths = Object.keys(openFiles);
    const missingPaths: string[] = [];
    const diskFiles = new Map<string, { content: string; lastModified: number }>();

    for (const path of paths) {
      if (path === "draft") continue;

      try {
        const handle = await resolveFileHandleAtPath(vaultHandle, path);
        if (handle) {
          set(atom_liveHandles(path), handle);
          // Tabs are restored from localStorage — read the file so they
          // reflect edits made on disk while the app was closed.
          try {
            const file = await handle.getFile();
            diskFiles.set(path, { content: await file.text(), lastModified: file.lastModified });
          } catch {
            // Locked or temporarily unavailable — keep the cached content
          }
        }
      } catch (err: any) {
        console.warn(`Failed to rebind handle for ${path}:`, err);
        // The file is gone (deleted outside the app, on another device,
        // etc.) rather than just transiently unreachable — close its tab
        // instead of leaving it open and pointing at nothing.
        if (err?.name === "NotFoundError") {
          missingPaths.push(path);
        }
      }
    }

    if (diskFiles.size > 0) {
      set(atom_openFiles, (prev) => {
        let next = prev;
        for (const [path, disk] of diskFiles) {
          const state = prev[path];
          if (!state) continue;
          const reconciled = reconcileWithDisk(state, disk.content, disk.lastModified);
          if (reconciled === state) continue;
          if (next === prev) next = { ...prev };
          next[path] = reconciled;
        }
        return next;
      });
    }

    if (missingPaths.length > 0) {
      const isMissing = (p: string) => missingPaths.includes(p);
      set(atom_workspaceLayout, (prev) => ({
        ...prev,
        rootContainer: removePathsFromLayout(prev.rootContainer, isMissing) as typeof prev.rootContainer,
      }));
      set(atom_openFiles, (prev) => {
        const next = { ...prev };
        for (const p of missingPaths) delete next[p];
        return next;
      });
    }
  },
);

// Follows a file or folder that was renamed or moved on disk: re-keys open
// tabs (keeping unsaved edits), pane layouts, indexed metadata, the worker's
// note-text index, the file tree's remembered expansion and Home pins (and
// sensitive-note session reveals) from `oldPath` to `newPath`, for the item
// and everything under it. Handles are path-based, so moving a folder leaves
// its children's handles stale — each moved tab gets a fresh handle resolved
// at its new path, so the next save lands in the moved file.
export const atom_remapVaultPaths = atom(
  null,
  async (get, set, { oldPath, newPath }: { oldPath: string; newPath: string }) => {
    if (!oldPath || !newPath || oldPath === newPath) return;
    const mapPath = (p: string) => remapPath(p, oldPath, newPath) ?? p;

    const vaultHandle = get(atom_vaultHandle);
    const movedTabs = Object.keys(get(atom_openFiles)).filter(
      (p) => p !== "draft" && remapPath(p, oldPath, newPath) !== null,
    );
    const freshHandles = new Map<string, FileSystemFileHandle | null>();
    for (const p of movedTabs) {
      const target = mapPath(p);
      let handle: FileSystemFileHandle | null = null;
      if (vaultHandle) {
        try {
          handle = await resolveFileHandleAtPath(vaultHandle, target);
        } catch (err) {
          console.warn(`Failed to resolve moved file ${target}:`, err);
        }
      }
      freshHandles.set(p, handle);
    }

    // All state updates happen after the awaits, back to back, so no render
    // sees tabs and layout pointing at different paths for long.
    set(atom_openFiles, (prev) => {
      const next: typeof prev = {};
      for (const [p, state] of Object.entries(prev)) {
        const target = p === "draft" ? p : mapPath(p);
        if (target === p) {
          next[p] = state;
          continue;
        }
        next[target] = {
          ...state,
          activeFilePath: target,
          ...(p === oldPath
            ? { fileName: (target.split("/").pop() || state.fileName).replace(".md", "") }
            : {}),
        };
      }
      return next;
    });
    set(atom_workspaceLayout, (prev) => ({
      ...prev,
      rootContainer: remapPathsInLayout(prev.rootContainer, (p) => (p === "draft" ? p : mapPath(p))) as typeof prev.rootContainer,
    }));
    for (const [p, handle] of freshHandles) {
      set(atom_liveHandles(mapPath(p)), handle ?? get(atom_liveHandles(p)));
      set(atom_liveHandles(p), null);
    }

    // Before the metadata update: the content-index sync then sees the old
    // keys disappear, and its remove reaches the worker after the remap.
    remapNoteContent(oldPath, newPath);
    set(atom_fileMetadata, (prev) => {
      let next = prev;
      for (const [p, meta] of Object.entries(prev)) {
        const target = remapPath(p, oldPath, newPath);
        if (target === null) continue;
        if (next === prev) next = { ...prev };
        delete next[p];
        next[target] = { ...meta, path: target, name: target.split("/").pop() || meta.name };
      }
      return next;
    });

    // Keep session reveals of sensitive notes across rename / move.
    set(atom_revealedSensitivePaths, (prev) => {
      if (![...prev].some((p) => remapPath(p, oldPath, newPath) !== null)) return prev;
      return new Set([...prev].map(mapPath));
    });

    const vaultKey = get(atom_vaultKey);
    if (vaultKey) {
      set(atom_fileTreeExpansion, (prev) => {
        const entry = prev[vaultKey];
        if (!entry) return prev;
        return {
          ...prev,
          [vaultKey]: { expanded: entry.expanded.map(mapPath), collapsed: entry.collapsed.map(mapPath) },
        };
      });
      set(atom_homePins, (prev) => {
        const pins = prev[vaultKey];
        if (!pins?.some((p) => remapPath(p, oldPath, newPath) !== null)) return prev;
        return { ...prev, [vaultKey]: pins.map(mapPath) };
      });
    }
  },
);

// Forgets remembered expansion for a deleted folder and everything under it.
export const atom_forgetFileTreePaths = atom(null, (get, set, deletedPath: string) => {
  const vaultKey = get(atom_vaultKey);
  if (!vaultKey || !deletedPath) return;
  const keep = (p: string) => remapPath(p, deletedPath, deletedPath) === null;
  set(atom_fileTreeExpansion, (prev) => {
    const entry = prev[vaultKey];
    if (!entry) return prev;
    return {
      ...prev,
      [vaultKey]: { expanded: entry.expanded.filter(keep), collapsed: entry.collapsed.filter(keep) },
    };
  });
});
