"use client";

import { useAtom, useSetAtom } from "jotai";
import { useCallback } from "react";
import toast from "react-hot-toast";
import {
  atom_vaultHandle,
  atom_currentDirectoryHandle,
  atom_remapVaultPaths,
} from "@/app/atoms/atoms";
import { writeFileContent } from "@/app/services/file-writer";
import { moveDirectoryByCopy } from "./directory-ops";

interface UseMoveItemProps {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: (passedHandle?: FileSystemDirectoryHandle) => Promise<void>;
}

export function useMoveItem({ scanVault, indexVaultTags }: UseMoveItemProps) {
  const [vaultHandle] = useAtom(atom_vaultHandle);
  const [currentDirectoryHandle] = useAtom(atom_currentDirectoryHandle);
  const remapVaultPaths = useSetAtom(atom_remapVaultPaths);

  const moveItem = useCallback(
    async (handle: FileSystemHandle, targetDir: FileSystemDirectoryHandle) => {
      if (!vaultHandle || !targetDir) return;

      // Resolve the real parent directory by walking the handle's actual path,
      // rather than assuming it's whatever directory the user last navigated to
      // (atom_currentDirectoryHandle) — that assumption breaks for items nested
      // deeper than the last-visited folder (e.g. dragging from a tree view).
      let sourceParent: FileSystemDirectoryHandle = currentDirectoryHandle || vaultHandle;
      try {
        const pathParts = await (vaultHandle as any).resolve(handle);
        if (pathParts && pathParts.length > 1) {
          let dir: FileSystemDirectoryHandle = vaultHandle;
          for (let i = 0; i < pathParts.length - 1; i++) {
            dir = await dir.getDirectoryHandle(pathParts[i]);
          }
          sourceParent = dir;
        } else if (pathParts && pathParts.length === 1) {
          sourceParent = vaultHandle;
        }
      } catch {
        // fall back to currentDirectoryHandle/vaultHandle above
      }

      const attemptMove = async (retryCount = 0): Promise<void> => {
        try {
          // 1. Get a FRESH handle from the parent to avoid "state changed" errors.
          //    Fall back to vaultHandle if the item isn't in sourceParent (e.g. user
          //    navigated into a subfolder since the drag started).
          let freshHandle: FileSystemHandle = handle;
          const parents = sourceParent === vaultHandle
            ? [vaultHandle]
            : [sourceParent, vaultHandle];
          let found = false;
          let foundParent: FileSystemDirectoryHandle = sourceParent;
          for (const parent of parents) {
            try {
              if (handle.kind === "file") {
                freshHandle = await (parent as any).getFileHandle(handle.name);
              } else {
                freshHandle = await (parent as any).getDirectoryHandle(handle.name);
              }
              found = true;
              foundParent = parent;
              break;
            } catch (e: any) {
              if (e.name !== "NotFoundError") throw e;
            }
          }
          if (!found) {
            toast.error(`Could not find "${handle.name}" — it may have been moved externally.`);
            return;
          }

          // 2. Prevent moving into itself or same directory
          let isSameEntry = false;
          try {
            isSameEntry = await (freshHandle as any).isSameEntry(targetDir);
          } catch {
            // Comparison failed
          }
          if (isSameEntry) {
            toast.error("Cannot move item into itself");
            return;
          }

          let isSameDir = false;
          try {
            isSameDir = await (foundParent as any).isSameEntry(targetDir);
          } catch {
            // Comparison failed
          }
          if (isSameDir) return;

          // Vault-relative paths before and after, for tabs/metadata/tree
          let oldPath: string | null = null;
          let newPath: string | null = null;
          try {
            const sourceParts: string[] | null = await (vaultHandle as any).resolve(freshHandle);
            const targetParts: string[] | null = await (vaultHandle as any).resolve(targetDir);
            if (sourceParts && targetParts) {
              oldPath = sourceParts.join("/");
              newPath = [...targetParts, freshHandle.name].join("/");
            }
          } catch {
            // resolve unsupported; tabs are reconciled on the next rebind
          }

          // 3. Attempt Native Move, with Fallback
          try {
            if ((freshHandle as any).move) {
              await (freshHandle as any).move(targetDir, freshHandle.name);
            } else {
              throw new Error("Native move not supported");
            }
          } catch (moveErr: any) {
            console.warn("Native move failed or unsupported, using fallback:", moveErr);
            if (freshHandle.kind === "file") {
              // Copy the File itself so binary attachments keep their bytes.
              const file = await (freshHandle as FileSystemFileHandle).getFile();
              const newFileHandle = await targetDir.getFileHandle(freshHandle.name, {
                create: true,
              });
              await writeFileContent(newFileHandle, file);
              await (foundParent as any).removeEntry(freshHandle.name);
            } else {
              await moveDirectoryByCopy(
                freshHandle as FileSystemDirectoryHandle,
                foundParent,
                targetDir,
                freshHandle.name,
              );
            }
          }

          // 4. Follow the move in open tabs (keeping unsaved edits, with fresh
          // handles), pane layouts, metadata and the file tree.
          if (oldPath && newPath) await remapVaultPaths({ oldPath, newPath });

          await scanVault(vaultHandle);
          indexVaultTags();
          toast.success(`Moved ${handle.name} to ${targetDir.name}`);
        } catch (err: any) {
          // If locked or stale, retry a few times
          const isRetryable = 
            err.name === "NoModificationAllowedError" || 
            err.name === "InvalidStateError" ||
            err.message?.includes("locked") || 
            err.message?.includes("state had changed");

          if (isRetryable && retryCount < 3) {
            console.warn(`Move operation issues (locked/stale), retrying (${retryCount + 1})...`);
            await new Promise((resolve) => setTimeout(resolve, 300 * (retryCount + 1)));
            return attemptMove(retryCount + 1);
          }
          throw err;
        }
      };

      try {
        await attemptMove();
      } catch (err: any) {
        console.error("File System Error:", err?.message || err);
        toast.error(err.message || "Failed to move item");
      }
    },
    [
      vaultHandle,
      currentDirectoryHandle,
      scanVault,
      indexVaultTags,
      remapVaultPaths,
    ],
  );

  return { moveItem };
}
