import { atom } from "jotai";
import { atom_openFiles, atom_liveHandles } from "./file-atoms";
import { atom_workspaceLayout } from "./workspace-atoms";
import { atom_snapshotOnConflict } from "./ui-atoms";
import { reconcileWithDisk } from "@/app/hooks/file-system/reconcile-disk";
import { removePathsFromLayout } from "./utils";
import type { GitHubVaultDescriptor } from "@/app/services/github-vault-workspace";
import type { BrowserVaultDescriptor } from "@/app/services/opfs";

// Vault / Local File System
export const atom_vaultHandle = atom<FileSystemDirectoryHandle | null>(null);
export const atom_currentDirectoryHandle =
  atom<FileSystemDirectoryHandle | null>(null);

export const atom_vaultFiles = atom<FileSystemHandle[]>([]);
export const atom_isVaultPending = atom<boolean>(false);
export const atom_hasLoadedVault = atom<boolean>(false);
export const atom_isCloudVault = atom<boolean>(false);
export const atom_fileSystemVersion = atom<number>(0);

export type VaultDescriptor =
  | { kind: "local" }
  | BrowserVaultDescriptor
  | GitHubVaultDescriptor;

export const atom_vaultDescriptor = atom<VaultDescriptor | null>(null);

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
        const parts = path.split("/");
        let current: any = vaultHandle;

        // Walk the directory structure
        for (let i = 0; i < parts.length - 1; i++) {
          current = await current.getDirectoryHandle(parts[i]);
        }

        // Get the file handle
        const handle = await current.getFileHandle(parts[parts.length - 1]);
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
      const snapshotOnConflict = get(atom_snapshotOnConflict);
      set(atom_openFiles, (prev) => {
        let next = prev;
        for (const [path, disk] of diskFiles) {
          const state = prev[path];
          if (!state) continue;
          const reconciled = reconcileWithDisk(state, disk.content, disk.lastModified, snapshotOnConflict);
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
