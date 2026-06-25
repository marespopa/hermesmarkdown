"use client";

import { useAtom } from "jotai";
import { useCallback } from "react";
import toast from "react-hot-toast";
import {
  atom_vaultHandle,
  atom_currentDirectoryHandle,
  atom_activeFileHandle,
  atom_fileName,
  atom_activeFilePath,
} from "@/app/atoms/atoms";
import { useDialog } from "../use-dialog";
import { withRetry } from "./shared";

interface UseRenameItemProps {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: (passedHandle?: FileSystemDirectoryHandle) => Promise<void>;
}

export function useRenameItem({ scanVault, indexVaultTags }: UseRenameItemProps) {
  const [vaultHandle] = useAtom(atom_vaultHandle);
  const [currentDirectoryHandle] = useAtom(atom_currentDirectoryHandle);
  const [activeFileHandle, setActiveFileHandle] = useAtom(atom_activeFileHandle);
  const [, setFileName] = useAtom(atom_fileName);
  const [, setActiveFilePath] = useAtom(atom_activeFilePath);
  const dialog = useDialog();

  const renameFile = useCallback(
    async (handle: FileSystemHandle) => {
      if (!vaultHandle) return;

      // Resolve the real parent directory by walking the handle's actual path,
      // rather than assuming it's whatever directory the user last navigated to
      // (atom_currentDirectoryHandle) — that assumption breaks for items nested
      // deeper than the last-visited folder.
      let parentDir: FileSystemDirectoryHandle = currentDirectoryHandle || vaultHandle;
      try {
        const pathParts = await (vaultHandle as any).resolve(handle);
        if (pathParts && pathParts.length > 1) {
          let dir: FileSystemDirectoryHandle = vaultHandle;
          for (let i = 0; i < pathParts.length - 1; i++) {
            dir = await dir.getDirectoryHandle(pathParts[i]);
          }
          parentDir = dir;
        } else if (pathParts && pathParts.length === 1) {
          parentDir = vaultHandle;
        }
      } catch {
        // fall back to currentDirectoryHandle/vaultHandle above
      }

      const newName = await dialog.prompt(
        "Enter new name:",
        handle.name,
        "Rename Item",
      );
      if (!newName || newName === handle.name) return;

      const attemptRename = async (retryCount = 0): Promise<void> => {
        try {
          // 1. Get a FRESH handle from the parent to avoid "state changed" errors
          let freshHandle: FileSystemHandle;
          try {
            if (handle.kind === "file") {
              freshHandle = await (parentDir as any).getFileHandle(handle.name);
            } else {
              freshHandle = await (parentDir as any).getDirectoryHandle(handle.name);
            }
          } catch (e: any) {
            console.warn("Failed to get fresh handle for rename, might be locked/swapped:", e);
            throw e; // Throw the original error so the outer catch can see if it's NotFoundError
          }

          // 2. Check if this is the active file
          let isActive = false;
          if (activeFileHandle) {
            try {
              isActive = await (freshHandle as any).isSameEntry(activeFileHandle);
            } catch {
              // Comparison failed
            }
          }

          // 3. Attempt Native Move with Fallback
          let moveSuccessful = false;
          if ((freshHandle as any).move) {
            try {
              // Use explicit parentDir for maximum compatibility on some browsers/OSs
              await (freshHandle as any).move(parentDir, newName);
              moveSuccessful = true;
            } catch (moveErr) {
              console.warn("Native move failed, falling back to copy/delete:", moveErr);
            }
          }

          if (moveSuccessful) {
            if (isActive) {
              setActiveFileHandle(freshHandle as FileSystemFileHandle);
              setFileName(newName.replace(".md", ""));

              // Recalculate path for metadata/tracking
              if (vaultHandle) {
                const pathParts = await (vaultHandle as any).resolve(freshHandle);
                if (pathParts) {
                  setActiveFilePath(pathParts.join("/"));
                } else {
                  setActiveFilePath(newName);
                }
              }
            }
          } else {
            // Fallback for files: manual copy and delete
            if (freshHandle.kind === "file") {
              const file = await (freshHandle as FileSystemFileHandle).getFile();
              const content = await file.text();
              const newFileHandle = await withRetry(() => parentDir.getFileHandle(newName, {
                create: true,
              }));
              let writable: FileSystemWritableFileStream | null = null;
              try {
                writable = await withRetry(() => (newFileHandle as any).createWritable());
                if (writable) {
                  await withRetry(() => writable!.write(content));
                  await withRetry(() => writable!.close());
                  writable = null;
                }
                await withRetry(() => (parentDir as any).removeEntry(freshHandle.name));

                if (isActive) {
                  setActiveFileHandle(newFileHandle);
                  setFileName(newName.replace(".md", ""));

                  // Recalculate path for metadata/tracking
                  if (vaultHandle) {
                    const pathParts = await (vaultHandle as any).resolve(newFileHandle);
                    if (pathParts) {
                      setActiveFilePath(pathParts.join("/"));
                    } else {
                      setActiveFilePath(newName);
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
              throw new Error("Folder renaming not supported in this browser");
            }
          }
          await scanVault(parentDir);
          indexVaultTags();
          toast.success("Renamed successfully");
        } catch (err: any) {
          const isRetryable =
            err.name === "InvalidStateError" ||
            err.name === "NoModificationAllowedError" ||
            err.name === "NotFoundError" ||
            err.message?.includes("state had changed") ||
            err.message?.includes("locked");

          if (isRetryable && retryCount < 6) {
            console.warn(`Rename operation issues, retrying (${retryCount + 1})...`);
            await new Promise((resolve) =>
              setTimeout(resolve, 400 * Math.pow(1.5, retryCount)),
            );
            return attemptRename(retryCount + 1);
          }
          throw err;
        }
      };

      try {
        await attemptRename();
      } catch (err: any) {
        console.error("File System Error:", err?.message || err);
        toast.error(err.message || "Failed to rename");
      }
    },
    [
      vaultHandle,
      currentDirectoryHandle,
      activeFileHandle,
      scanVault,
      indexVaultTags,
      setFileName,
      setActiveFileHandle,
      setActiveFilePath,
      dialog,
    ],
  );

  return { renameFile };
}
