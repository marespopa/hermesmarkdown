"use client";

import { useAtom } from "jotai";
import { useCallback } from "react";
import toast from "react-hot-toast";
import {
  atom_vaultHandle,
  atom_currentDirectoryHandle,
} from "@/app/atoms/atoms";
import { useDialog } from "../use-dialog";
import { withRetry } from "./shared";

interface UseCreateItemProps {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: (passedHandle?: FileSystemDirectoryHandle) => Promise<void>;
  openFile: (fileHandle: FileSystemFileHandle, providedPath?: string, force?: boolean) => Promise<void>;
  navigateTo: (handle: FileSystemDirectoryHandle) => Promise<void>;
}

export function useCreateItem({ scanVault, indexVaultTags, openFile, navigateTo }: UseCreateItemProps) {
  const [vaultHandle] = useAtom(atom_vaultHandle);
  const [currentDirectoryHandle] = useAtom(atom_currentDirectoryHandle);
  const dialog = useDialog();

  const createFile = useCallback(
    async (name: string, content: string = "", dirOverride?: FileSystemDirectoryHandle) => {
      const targetDir = dirOverride || currentDirectoryHandle || vaultHandle;
      if (!targetDir) return null;

      const baseName = name.endsWith(".md") ? name.slice(0, -3) : name;
      let fileName = `${baseName}.md`;
      let counter = 1;
      let newFileHandle: FileSystemFileHandle | null = null;

      try {
        // Conflict Resolution Loop: find a unique filename
        while (true) {
          try {
            await withRetry(() => targetDir.getFileHandle(fileName, { create: false }));
            // If the above doesn't throw, the file already exists
            fileName = `${baseName} (${counter++}).md`;
          } catch (err: any) {
            if (err.name === "NotFoundError") {
              // Found a unique name!
              newFileHandle = await withRetry(() => targetDir.getFileHandle(fileName, { create: true }));
              break;
            }
            throw err;
          }
        }

        if (!newFileHandle) throw new Error("Failed to resolve file handle");

        // Write content immediately if provided
        await withRetry(async () => {
          const writable = await (newFileHandle as any).createWritable();
          await writable.write(content);
          await writable.close();
        });

        await scanVault(targetDir);
        await indexVaultTags();

        // Calculate path for opening
        let path = fileName;
        const resolveDir = dirOverride || currentDirectoryHandle;
        if (vaultHandle && resolveDir) {
          let isRoot = false;
          try {
            isRoot = await (vaultHandle as any).isSameEntry(resolveDir);
          } catch {
            isRoot = vaultHandle.name === resolveDir.name;
          }

          if (!isRoot) {
            try {
              const relativePath = await (vaultHandle as any).resolve(resolveDir);
              if (relativePath) {
                path = [...relativePath, fileName].join("/");
              }
            } catch (e) {
              console.warn("Failed to resolve relative path:", e);
            }
          }
        }

        await openFile(newFileHandle, path, true);
        
        toast.success("Created: " + fileName);
        return newFileHandle;
      } catch (err: any) {
        console.error("File System Error:", err?.message || err);
        toast.error("Failed to create file");
        return null;
      }
    },
    [vaultHandle, currentDirectoryHandle, scanVault, indexVaultTags, openFile],
  );

  const createNewFile = useCallback(async (dirHandle?: FileSystemDirectoryHandle) => {
    const targetDir = dirHandle || currentDirectoryHandle || vaultHandle;
    if (!targetDir) return;

    if (dirHandle) await navigateTo(dirHandle);

    const name = await dialog.prompt("Enter file name (without .md):", "", "New File");
    if (!name) return;

    return await createFile(name, "", dirHandle);
  }, [vaultHandle, currentDirectoryHandle, createFile, dialog, navigateTo]);

  const createNewFolder = useCallback(async (dirHandle?: FileSystemDirectoryHandle) => {
    const targetDir = dirHandle || currentDirectoryHandle || vaultHandle;
    if (!targetDir) return;

    if (dirHandle) await navigateTo(dirHandle);

    const name = await dialog.prompt("Enter folder name:", "", "New Folder");
    if (!name) return;

    try {
      await withRetry(() => targetDir.getDirectoryHandle(name, { create: true }));
      await scanVault(targetDir);
      toast.success("Folder created: " + name);
    } catch (err: any) {
      console.error("File System Error:", err?.message || err);
      toast.error("Failed to create folder");
    }
  }, [vaultHandle, currentDirectoryHandle, scanVault, dialog, navigateTo]);

  return {
    createFile,
    createNewFile,
    createNewFolder,
  };
}
