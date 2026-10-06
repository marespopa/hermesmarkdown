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
import { useDialog } from "../use-dialog";
import { emptyDirectory } from "./directory-ops";

interface UseDeleteItemProps {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: (passedHandle?: FileSystemDirectoryHandle) => Promise<void>;
}

export function useDeleteItem({ scanVault, indexVaultTags }: UseDeleteItemProps) {
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

  const deleteFile = useCallback(
    async (handle: FileSystemHandle, path?: string) => {
      const type = handle.kind === "file" ? "file" : "folder";
      const confirmed = await dialog.confirm(
        `Delete ${type} "${handle.name}"? This cannot be undone.`,
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

        setFileMetadata((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((p) => { if (isDeletedPath(p)) delete next[p]; });
          return next;
        });
        setVaultFiles((prev) => prev.filter((f) => !isDeletedPath((f as any).path || f.name)));
        setVaultFolderPaths((prev) => prev.filter((p) => !isDeletedPath(p)));

        // Update workspace layout to remove all tabs matching the deleted item
        setWorkspaceLayout((prev) => ({
          ...prev,
          rootContainer: removePathsFromLayout(prev.rootContainer, isDeletedPath) as typeof prev.rootContainer,
        }));

        // Clean up openFiles registry
        setOpenFiles((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((p) => { if (isDeletedPath(p)) delete next[p]; });
          return next;
        });

        if (handle.kind === "directory" && path) forgetFileTreePaths(path);
        if (path) forgetHomePins(path);

        if (
          activeFileHandle?.name === handle.name ||
          (handle.kind === "directory" && activeFileHandle)
        ) {
          setActiveFileHandle(null);
        }

        if (parentDir) {
          await scanVault(parentDir);
        }
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
    [
      vaultHandle,
      currentDirectoryHandle,
      activeFileHandle,
      scanVault,
      indexVaultTags,
      setWorkspaceLayout,
      setOpenFiles,
      setActiveFileHandle,
      setFileMetadata,
      setVaultFiles,
      setVaultFolderPaths,
      forgetFileTreePaths,
      forgetHomePins,
      dialog,
    ],
  );

  return { deleteFile };
}
