"use client";

import { useAtom } from "jotai";
import { useCallback } from "react";
import toast from "react-hot-toast";
import { atom_vaultHandle, atom_currentDirectoryHandle } from "@/app/atoms/atoms";
import { useDialog } from "../use-dialog";
import { withRetry } from "./shared";

interface UseDuplicateItemProps {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: (passedHandle?: FileSystemDirectoryHandle) => Promise<void>;
  openFile: (fileHandle: FileSystemFileHandle, providedPath?: string, force?: boolean) => Promise<void>;
}

export function useDuplicateItem({ scanVault, indexVaultTags, openFile }: UseDuplicateItemProps) {
  const [vaultHandle] = useAtom(atom_vaultHandle);
  const [currentDirectoryHandle] = useAtom(atom_currentDirectoryHandle);
  const dialog = useDialog();

  const duplicateFile = useCallback(
    async (handle: FileSystemHandle) => {
      if (!vaultHandle || handle.kind !== "file") return;

      const currentBaseName = handle.name.endsWith(".md") ? handle.name.slice(0, -3) : handle.name;
      const enteredName = await dialog.prompt(
        "Enter name for duplicate:",
        `${currentBaseName} copy`,
        "Duplicate File",
      );
      if (!enteredName) return;

      // Resolve the real parent directory by walking the handle's actual path,
      // same approach as rename/delete — the currently-navigated directory can
      // differ from the item's actual parent for nested files.
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

      try {
        const fileHandle = handle as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        const content = await file.text();

        const baseName = enteredName.endsWith(".md") ? enteredName.slice(0, -3) : enteredName;
        let newName = `${baseName}.md`;
        let counter = 2;
        let newFileHandle: FileSystemFileHandle | null = null;

        while (true) {
          try {
            await withRetry(() => parentDir.getFileHandle(newName, { create: false }));
            newName = `${baseName} (${counter++}).md`;
          } catch (err: any) {
            if (err.name === "NotFoundError") {
              newFileHandle = await withRetry(() => parentDir.getFileHandle(newName, { create: true }));
              break;
            }
            throw err;
          }
        }

        if (!newFileHandle) throw new Error("Failed to resolve file handle");

        await withRetry(async () => {
          const writable = await (newFileHandle as any).createWritable();
          await writable.write(content);
          await writable.close();
        });

        await scanVault(parentDir);
        indexVaultTags();

        let path = newName;
        try {
          const relativePath = await (vaultHandle as any).resolve(newFileHandle);
          if (relativePath) path = relativePath.join("/");
        } catch {
          // fall back to bare filename
        }

        await openFile(newFileHandle, path, true);
        toast.success("Duplicated: " + newName);
      } catch (err: any) {
        console.error("File System Error:", err?.message || err);
        toast.error(err.message || "Failed to duplicate file");
      }
    },
    [vaultHandle, currentDirectoryHandle, scanVault, indexVaultTags, openFile, dialog],
  );

  return { duplicateFile };
}
