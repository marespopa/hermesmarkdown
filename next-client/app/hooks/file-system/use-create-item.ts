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
}

export function useCreateItem({ scanVault, indexVaultTags, openFile }: UseCreateItemProps) {
  const [vaultHandle] = useAtom(atom_vaultHandle);
  const [currentDirectoryHandle] = useAtom(atom_currentDirectoryHandle);
  const dialog = useDialog();

  const chooseTargetDirectory = useCallback(async () => {
    if (!vaultHandle) return null;

    const subDirs: FileSystemDirectoryHandle[] = [];
    try {
      for await (const entry of (vaultHandle as any).values()) {
        if (entry.kind === "directory" && !entry.name.startsWith(".")) {
          subDirs.push(entry);
        }
      }
    } catch (err: any) {
      console.warn("Failed to list vault subdirectories:", err?.message || err);
    }
    subDirs.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

    const options = [
      { label: `/ ${vaultHandle.name} (root)`, value: "__root__" },
      ...subDirs.map((d) => ({ label: d.name, value: d.name })),
      { label: "+ New Folder", value: "__new_folder__" },
    ];
    const chosen = await dialog.select("Choose a folder for the new file:", options, "New File");
    if (!chosen) return null;

    if (chosen === "__new_folder__") {
      const folderName = await dialog.prompt("Enter folder name:", "", "New Folder");
      if (!folderName) return null;
      try {
        const newDir = await withRetry(() =>
          vaultHandle.getDirectoryHandle(folderName, { create: true })
        );
        await scanVault(vaultHandle);
        return newDir;
      } catch (err: any) {
        console.error("File System Error:", err?.message || err);
        toast.error("Failed to create folder");
        return null;
      }
    }

    if (chosen === "__root__") return vaultHandle;
    return subDirs.find((d) => d.name === chosen) || null;
  }, [dialog, scanVault, vaultHandle]);

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

        // Write content immediately if provided.
        // If empty, pad with a newline to prevent creating a 0-byte file,
        // which causes Google Drive to hang in an infinite sync loop.
        let contentToWrite = content;
        if (!contentToWrite) contentToWrite = "\n";
        await withRetry(async () => {
          let writable: FileSystemWritableFileStream | null = null;
          try {
            const stream = await (newFileHandle as any).createWritable() as FileSystemWritableFileStream;
            writable = stream;
            await stream.write(contentToWrite);
            await stream.close();
            writable = null;
          } finally {
            if (writable) await writable.close();
          }
        });

        await scanVault(vaultHandle || currentDirectoryHandle || targetDir);
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
        console.warn("File System Error:", err?.message || err);
        const isInvalidState = err.name === "InvalidStateError" || (err.message && err.message.includes("state cached"));
        if (isInvalidState) {
          toast.error("Google Drive is syncing. Please wait a moment and try again.");
        } else {
          toast.error("Failed to create file");
        }
        return null;
      }
    },
    [vaultHandle, currentDirectoryHandle, scanVault, indexVaultTags, openFile],
  );

  const createWikiLinkFile = useCallback(async (name: string) => {
    const targetDir = await chooseTargetDirectory();
    if (!targetDir) return null;

    const baseName = name.endsWith(".md") ? name.slice(0, -3) : name;
    let fileName = `${baseName}.md`;
    let counter = 1;
    let newFileHandle: FileSystemFileHandle | null = null;

    try {
      while (true) {
        try {
          await withRetry(() => targetDir.getFileHandle(fileName, { create: false }));
          fileName = `${baseName} (${counter++}).md`;
        } catch (err: any) {
          if (err.name === "NotFoundError") {
            newFileHandle = await withRetry(() => targetDir.getFileHandle(fileName, { create: true }));
            break;
          }
          throw err;
        }
      }

      if (!newFileHandle) throw new Error("Failed to resolve file handle");
      await withRetry(async () => {
        let writable: FileSystemWritableFileStream | null = null;
        try {
          const stream = await (newFileHandle as any).createWritable() as FileSystemWritableFileStream;
          writable = stream;
          await stream.write("\n");
          await stream.close();
          writable = null;
        } finally {
          if (writable) await writable.close();
        }
      });
      await scanVault(vaultHandle || currentDirectoryHandle || targetDir);
      await indexVaultTags();

      let path = fileName;
      if (vaultHandle) {
        let isRoot = false;
        try {
          isRoot = await (vaultHandle as any).isSameEntry(targetDir);
        } catch {
          isRoot = vaultHandle.name === targetDir.name;
        }
        if (!isRoot) {
          const relativePath = await (vaultHandle as any).resolve(targetDir);
          if (relativePath) path = [...relativePath, fileName].join("/");
        }
      }

      toast.success("Created: " + fileName);
      return path.replace(/\.md$/, "");
    } catch (err: any) {
      console.warn("File System Error:", err?.message || err);
      toast.error("Failed to create file");
      return null;
    }
  }, [chooseTargetDirectory, scanVault, indexVaultTags, vaultHandle, currentDirectoryHandle]);

  const createNewFile = useCallback(async () => {
    if (!vaultHandle) return;

    const targetDir = await chooseTargetDirectory();
    if (!targetDir) return;

    const name = await dialog.prompt("Enter file name:", "Untitled", "New File");
    if (!name?.trim()) return;

    return createFile(name.trim(), "", targetDir);
  }, [vaultHandle, chooseTargetDirectory, createFile, dialog]);

  const createFolder = useCallback(async (parentDirectory?: FileSystemDirectoryHandle) => {
    const targetDirectory = parentDirectory || vaultHandle;
    if (!targetDirectory || !vaultHandle) return null;

    const folderName = String(await dialog.prompt("Enter folder name:", "", "New Folder") ?? "").trim();
    if (!folderName) return null;
    if (/[\\/]/.test(folderName)) {
      toast.error("Folder names cannot contain slashes.");
      return null;
    }

    try {
      const folder = await withRetry(() => targetDirectory.getDirectoryHandle(folderName, { create: true }));
      await scanVault(vaultHandle);
      toast.success(`Created: ${folderName}`);
      return folder;
    } catch (error) {
      console.error("Failed to create folder:", error);
      toast.error("Failed to create folder.");
      return null;
    }
  }, [dialog, scanVault, vaultHandle]);

  return {
    chooseTargetDirectory,
    createFile,
    createWikiLinkFile,
    createNewFile,
    createFolder,
  };
}
