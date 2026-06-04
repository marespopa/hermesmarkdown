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
      const parentDir = currentDirectoryHandle || vaultHandle;
      if (!parentDir) return;

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
          } catch (e) {
            console.error("Failed to get fresh handle for rename:", e);
            throw new Error("Item no longer exists or is inaccessible");
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
            err.message?.includes("state had changed") ||
            err.message?.includes("locked");

          if (isRetryable && retryCount < 3) {
            console.warn(`Rename operation issues, retrying (${retryCount + 1})...`);
            await new Promise((resolve) =>
              setTimeout(resolve, 300 * (retryCount + 1)),
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
