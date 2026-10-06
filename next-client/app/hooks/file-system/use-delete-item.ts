"use client";

import { useAtom, useSetAtom } from "jotai";
import { useCallback } from "react";
import toast from "react-hot-toast";
import {
  atom_vaultHandle,
  atom_currentDirectoryHandle,
  atom_activeFileHandle,
  atom_openFiles,
  atom_workspaceLayout,
} from "@/app/atoms/atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_forgetFileTreePaths, atom_vaultFiles, atom_vaultFolderPaths } from "@/app/atoms/vault-atoms";
import { atom_forgetHomePins } from "@/app/atoms/home-pin-atoms";
import { removePathsFromLayout } from "@/app/atoms/utils";
import type { FileUndoGroup } from "@/app/atoms/vault-atoms";
import { useDialog } from "../use-dialog";
import { emptyDirectory } from "./directory-ops";
import { moveToTrash } from "./trash-ops";
import { showUndoToast } from "./undo-toast";

interface UseDeleteItemProps {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: (passedHandle?: FileSystemDirectoryHandle) => Promise<void>;
  recordUndo: (label: string, moves: FileUndoGroup["moves"]) => FileUndoGroup | null;
  undoFileOperation: (expected?: FileUndoGroup) => Promise<boolean>;
}

export interface TrashItem {
  handle: FileSystemHandle;
  // Vault-relative path; without it the item can't be found again, so it is
  // deleted permanently (after asking).
  path?: string;
}

// Items inside a folder that is trashed too go along with it.
export function outermostItems<T extends { path: string }>(items: T[]): T[] {
  const unique = items.filter((item, i) => items.findIndex((other) => other.path === item.path) === i);
  return unique.filter((item) => !unique.some((other) => other !== item && item.path.startsWith(`${other.path}/`)));
}

// Delete moves items to the vault's Trash (`.hermes/trash`, emptied after 30
// days) and offers Undo; only when that fails, or the item's path is
// unknown, is it deleted permanently, after a confirmation.
export function useDeleteItem({ scanVault, indexVaultTags, recordUndo, undoFileOperation }: UseDeleteItemProps) {
  const [vaultHandle] = useAtom(atom_vaultHandle);
  const [currentDirectoryHandle] = useAtom(atom_currentDirectoryHandle);
  const [activeFileHandle, setActiveFileHandle] = useAtom(atom_activeFileHandle);
  const [, setOpenFiles] = useAtom(atom_openFiles);
  const [, setWorkspaceLayout] = useAtom(atom_workspaceLayout);
  const setFileMetadata = useSetAtom(atom_fileMetadata);
  const setVaultFiles = useSetAtom(atom_vaultFiles);
  const setVaultFolderPaths = useSetAtom(atom_vaultFolderPaths);
  const forgetFileTreePaths = useSetAtom(atom_forgetFileTreePaths);
  const forgetHomePins = useSetAtom(atom_forgetHomePins);
  const dialog = useDialog();

  // Clears a removed item (and, for a folder, everything in it) from the
  // tabs, metadata and file tree right away, without waiting for a re-index.
  const forgetItem = useCallback((handle: FileSystemHandle, isRemovedPath: (p: string) => boolean, path?: string) => {
    setFileMetadata((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((p) => { if (isRemovedPath(p)) delete next[p]; });
      return next;
    });
    setVaultFiles((prev) => prev.filter((f) => !isRemovedPath((f as any).path || f.name)));
    setVaultFolderPaths((prev) => prev.filter((p) => !isRemovedPath(p)));
    setWorkspaceLayout((prev) => ({
      ...prev,
      rootContainer: removePathsFromLayout(prev.rootContainer, isRemovedPath) as typeof prev.rootContainer,
    }));
    setOpenFiles((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((p) => { if (isRemovedPath(p)) delete next[p]; });
      return next;
    });
    if (handle.kind === "directory" && path) forgetFileTreePaths(path);
    if (path) forgetHomePins(path);
    if (activeFileHandle?.name === handle.name || (handle.kind === "directory" && activeFileHandle)) {
      setActiveFileHandle(null);
    }
  }, [setFileMetadata, setVaultFiles, setVaultFolderPaths, setWorkspaceLayout, setOpenFiles, forgetFileTreePaths, forgetHomePins, activeFileHandle, setActiveFileHandle]);

  const deleteForever = useCallback(
    async (handle: FileSystemHandle, path?: string, question?: string) => {
      const type = handle.kind === "file" ? "file" : "folder";
      const confirmed = await dialog.confirm(
        question ?? `Delete ${type} "${handle.name}"? This cannot be undone.`,
        `Delete ${type}`,
        "Delete",
        "Cancel",
      );
      if (!confirmed) return;

      const attemptDelete = async (retryCount = 0): Promise<void> => {
        if (!vaultHandle) return;

        let parentDir: FileSystemDirectoryHandle | null = null;
        let removeErr: any;
        let dirToUse: FileSystemDirectoryHandle = vaultHandle;

        try {
          // Prefer the caller-provided path (from fileMetadata/tree state) to walk
          // to the real parent directory. `vaultHandle.resolve(handle)` is the
          // alternative, but it's known to silently fail for handles rehydrated
          // from IndexedDB across a page reload — when that happens it used to
          // fall back to `currentDirectoryHandle` (last-browsed folder, often
          // unrelated to this item) or the vault root, so `removeEntry` threw
          // NotFoundError against the wrong directory. That error was treated as
          // "already deleted" success, so the UI removed the item locally while
          // the real file stayed on disk — then the next full reindex found it
          // again and it reappeared. Walking a known path sidesteps resolve()
          // entirely instead of hardening its failure modes one at a time.
          if (path) {
            const segments = path.split("/");
            segments.pop(); // drop the item's own name, keep only parent segments
            for (const segment of segments) {
              dirToUse = await dirToUse.getDirectoryHandle(segment);
            }
          } else {
            let pathParts: string[] | null = null;
            try {
              pathParts = await (vaultHandle as any).resolve(handle);
            } catch {
              // fallback if resolve fails
            }

            if (pathParts && pathParts.length > 1) {
              // Traverse to the parent directory
              for (let i = 0; i < pathParts.length - 1; i++) {
                dirToUse = await dirToUse.getDirectoryHandle(pathParts[i]);
              }
            } else if (!pathParts && currentDirectoryHandle && currentDirectoryHandle !== vaultHandle) {
              // Fallback for when resolve isn't supported or fails
              try {
                await (currentDirectoryHandle as any).getFileHandle(handle.name);
                dirToUse = currentDirectoryHandle;
              } catch {
                try {
                  await (currentDirectoryHandle as any).getDirectoryHandle(handle.name);
                  dirToUse = currentDirectoryHandle;
                } catch {
                  dirToUse = vaultHandle;
                }
              }
            }
          }

          if (handle.kind === "directory") {
            // Empty it ourselves first (see emptyDirectory), then remove
            // the now-empty shell — no `{recursive: true}` call anywhere.
            await emptyDirectory(handle as FileSystemDirectoryHandle);
          }
          if (typeof (handle as any).remove === "function") {
            await (handle as any).remove();
          } else {
            await (dirToUse as any).removeEntry(handle.name);
          }
          parentDir = dirToUse;
        } catch (err: any) {
          if (err.name === "NotFoundError") {
            // The file is already gone, treat it as a success!
            parentDir = dirToUse;
          } else {
            // Retryable FS errors
            const isRetryable =
              err.name === "InvalidStateError" ||
              err.name === "NoModificationAllowedError" ||
              err.message?.includes("state had changed") ||
              err.message?.includes("locked");
            if (isRetryable && retryCount < 6) {
              console.warn(`Delete operation issues, retrying (${retryCount + 1})...`);
              await new Promise((resolve) => setTimeout(resolve, 400 * Math.pow(1.5, retryCount)));
              return attemptDelete(retryCount + 1);
            }
            throw err;
          }
        }
        
        if (!parentDir && removeErr) throw removeErr;

        // Eagerly remove the deleted entry from file-tree caches so it disappears
        // immediately without waiting for the async re-index to complete.
        // (indexVaultTags merge-mode never removes entries, so this is the only
        // mechanism that clears a deleted file from fileMetadata.)
        //
        // Prefer the known full path when the caller has one: matching by
        // basename alone (the old fallback) both over-matches — deleting
        // "notes/foo.md" would also drop an unrelated "archive/foo.md" — and
        // under-matches nested folders, since `handle.name` for a folder is
        // just its own name, not its path, so `path.startsWith(handle.name + "/")`
        // never matches a folder that isn't at the vault root.
        const isDeletedPath = (p: string) => {
          if (path) {
            return handle.kind === "file" ? p === path : p === path || p.startsWith(path + "/");
          }
          return handle.kind === "file"
            ? p.split("/").pop() === handle.name
            : p.startsWith(handle.name + "/") || p === handle.name;
        };

        forgetItem(handle, isDeletedPath, path);

        // The whole vault: listing just the parent would replace the root
        // listing the file tree reads its top-level folders from.
        if (parentDir) await scanVault(vaultHandle);
        indexVaultTags();
        toast.success(`${handle.name} deleted`);
      };

      try {
        await attemptDelete();
      } catch (err: any) {
        console.error("File System Error:", err?.message || err);
        toast.error("Failed to delete");
      }
    },
    [vaultHandle, currentDirectoryHandle, scanVault, indexVaultTags, forgetItem, dialog],
  );

  const trashItems = useCallback(
    async (items: TrashItem[]) => {
      if (!vaultHandle || items.length === 0) return;
      const located: { handle: FileSystemHandle; path: string }[] = [];
      for (const item of items) {
        let path = item.path;
        if (!path) {
          try {
            path = ((await (vaultHandle as any).resolve(item.handle)) as string[] | null)?.join("/") || undefined;
          } catch {
            // unknown path: permanent delete below
          }
        }
        if (path) located.push({ handle: item.handle, path });
        else await deleteForever(item.handle);
      }

      const now = new Date();
      const moves: FileUndoGroup["moves"] = [];
      const failed: typeof located = [];
      for (const [index, item] of outermostItems(located).entries()) {
        try {
          moves.push({ from: item.path, to: await moveToTrash(vaultHandle, item.path, now, index) });
          const isTrashed = (p: string) => p === item.path || (item.handle.kind === "directory" && p.startsWith(`${item.path}/`));
          forgetItem(item.handle, isTrashed, item.path);
        } catch (err) {
          console.error(`Failed to move ${item.path} to the Trash:`, err);
          failed.push(item);
        }
      }

      if (moves.length > 0) {
        await scanVault(vaultHandle);
        void indexVaultTags();
        const group = recordUndo("Move to Trash", moves);
        const name = moves[0].from.split("/").pop();
        showUndoToast(
          moves.length === 1 ? `Moved “${name}” to Trash` : `Moved ${moves.length} items to Trash`,
          () => void undoFileOperation(group ?? undefined),
        );
      }
      for (const item of failed) {
        await deleteForever(
          item.handle,
          item.path,
          `“${item.handle.name}” couldn't be moved to the Trash. Delete it permanently? This cannot be undone.`,
        );
      }
    },
    [vaultHandle, scanVault, indexVaultTags, forgetItem, deleteForever, recordUndo, undoFileOperation],
  );

  const deleteFile = useCallback(
    (handle: FileSystemHandle, path?: string) => trashItems([{ handle, path }]),
    [trashItems],
  );

  return { deleteFile, trashItems };
}
