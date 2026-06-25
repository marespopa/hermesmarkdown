"use client";

import { useAtom } from "jotai";
import { useCallback } from "react";
import toast from "react-hot-toast";
import {
  atom_vaultHandle,
  atom_currentDirectoryHandle,
  atom_activeFileHandle,
  atom_activeFilePath,
} from "@/app/atoms/atoms";

interface UseMoveItemProps {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: (passedHandle?: FileSystemDirectoryHandle) => Promise<void>;
}

export function useMoveItem({ scanVault, indexVaultTags }: UseMoveItemProps) {
  const [vaultHandle] = useAtom(atom_vaultHandle);
  const [currentDirectoryHandle] = useAtom(atom_currentDirectoryHandle);
  const [activeFileHandle, setActiveFileHandle] = useAtom(atom_activeFileHandle);
  const [, setActiveFilePath] = useAtom(atom_activeFilePath);

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
          for (const parent of parents) {
            try {
              if (handle.kind === "file") {
                freshHandle = await (parent as any).getFileHandle(handle.name);
              } else {
                freshHandle = await (parent as any).getDirectoryHandle(handle.name);
              }
              found = true;
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
            isSameDir = await (sourceParent as any).isSameEntry(targetDir);
          } catch {
            // Comparison failed
          }
          if (isSameDir) return;

          let isActive = false;
          if (activeFileHandle) {
            try {
              isActive = await (freshHandle as any).isSameEntry(activeFileHandle);
            } catch {
            // Comparison failed
          }
          }

          // 3. Attempt Native Move, with Fallback
          try {
            if ((freshHandle as any).move) {
              await (freshHandle as any).move(targetDir, freshHandle.name);
              if (isActive) {
                setActiveFileHandle(freshHandle as FileSystemFileHandle);
                
                // Recalculate path for metadata/tracking
                if (vaultHandle) {
                  const pathParts = await (vaultHandle as any).resolve(freshHandle);
                  if (pathParts) {
                    setActiveFilePath(pathParts.join("/"));
                  }
                }
              }
            } else {
              throw new Error("Native move not supported");
            }
          } catch (moveErr: any) {
            // Fallback for files: manual copy and delete
            if (freshHandle.kind === "file") {
              console.warn("Native move failed or unsupported, using fallback:", moveErr);
              const file = await (freshHandle as FileSystemFileHandle).getFile();
              const content = await file.text();
              const newFileHandle = await targetDir.getFileHandle(freshHandle.name, {
                create: true,
              });
              
              let writable: FileSystemWritableFileStream | null = null;
              try {
                writable = await newFileHandle.createWritable();
                if (writable) {
                  await writable.write(content);
                  await writable.close();
                  writable = null;
                }
                await (sourceParent as any).removeEntry(freshHandle.name);

                if (isActive) {
                  setActiveFileHandle(newFileHandle);
                  
                  // Recalculate path for metadata/tracking
                  if (vaultHandle) {
                    const pathParts = await (vaultHandle as any).resolve(newFileHandle);
                    if (pathParts) {
                      setActiveFilePath(pathParts.join("/"));
                    }
                  }
                }
              } finally {
                if (writable) {
                  try {
                    await (writable as any).close();
                  } catch {
                    // Ignore cleanup error
                  }
                }
              }
            } else {
              throw moveErr;
            }
          }

          await scanVault(sourceParent);
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
      activeFileHandle,
      scanVault,
      indexVaultTags,
      setActiveFileHandle,
      setActiveFilePath,
    ],
  );

  return { moveItem };
}
