"use client";

import { useAtom, useSetAtom } from "jotai";
import { useCallback } from "react";
import toast from "react-hot-toast";
import {
  atom_vaultHandle,
  atom_currentDirectoryHandle,
  atom_remapVaultPaths,
} from "@/app/atoms/atoms";
import type { FileUndoGroup } from "@/app/atoms/vault-atoms";
import { writeFileContent } from "@/app/services/file-writer";
import { moveDirectoryByCopy } from "./directory-ops";
import { showUndoToast } from "./undo-toast";

interface UseMoveItemProps {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: (passedHandle?: FileSystemDirectoryHandle) => Promise<void>;
  recordUndo: (label: string, moves: FileUndoGroup["moves"]) => FileUndoGroup | null;
  undoFileOperation: (expected?: FileUndoGroup) => Promise<boolean>;
}

type MoveOutcome = { oldPath: string | null; newPath: string | null } | null;

export function useMoveItem({ scanVault, indexVaultTags, recordUndo, undoFileOperation }: UseMoveItemProps) {
  const [vaultHandle] = useAtom(atom_vaultHandle);
  const [currentDirectoryHandle] = useAtom(atom_currentDirectoryHandle);
  const remapVaultPaths = useSetAtom(atom_remapVaultPaths);

  // Moves one item and follows it in tabs and metadata; null when nothing
  // moved (not found, already there, or into itself). Throws on failure.
  const moveOne = useCallback(
    async (handle: FileSystemHandle, targetDir: FileSystemDirectoryHandle): Promise<MoveOutcome> => {
      if (!vaultHandle) return null;

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

      const attemptMove = async (retryCount = 0): Promise<MoveOutcome> => {
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
            return null;
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
            return null;
          }

          let isSameDir = false;
          try {
            isSameDir = await (foundParent as any).isSameEntry(targetDir);
          } catch {
            // Comparison failed
          }
          if (isSameDir) return null;

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
          return { oldPath, newPath };
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

      return attemptMove();
    },
    [vaultHandle, currentDirectoryHandle, remapVaultPaths],
  );

  // Moves items into `targetDir` as one action: one rescan, one toast and
  // one Undo for all of them.
  const moveItems = useCallback(
    async (handles: FileSystemHandle[], targetDir: FileSystemDirectoryHandle) => {
      if (!vaultHandle || !targetDir || handles.length === 0) return;
      const moves: FileUndoGroup["moves"] = [];
      let movedCount = 0;
      for (const handle of handles) {
        try {
          const outcome = await moveOne(handle, targetDir);
          if (!outcome) continue;
          movedCount++;
          if (outcome.oldPath && outcome.newPath) moves.push({ from: outcome.oldPath, to: outcome.newPath });
        } catch (err: any) {
          console.error("File System Error:", err?.message || err);
          toast.error(err.message || `Failed to move ${handle.name}`);
        }
      }
      if (movedCount === 0) return;

      await scanVault(vaultHandle);
      indexVaultTags();
      const group = recordUndo("Move", moves);
      const message = movedCount === 1
        ? `Moved ${handles.length === 1 ? handles[0].name : "1 item"} to ${targetDir.name}`
        : `Moved ${movedCount} items to ${targetDir.name}`;
      if (group) showUndoToast(message, () => void undoFileOperation(group));
      else toast.success(message);
    },
    [vaultHandle, moveOne, scanVault, indexVaultTags, recordUndo, undoFileOperation],
  );

  const moveItem = useCallback(
    (handle: FileSystemHandle, targetDir: FileSystemDirectoryHandle) => moveItems([handle], targetDir),
    [moveItems],
  );

  return { moveItem, moveItems };
}
