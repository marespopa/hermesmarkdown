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
import { createUniqueFile } from "./unique-file";
import { writeFileContent } from "@/app/services/file-writer";

interface UseCreateItemProps {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: (passedHandle?: FileSystemDirectoryHandle) => Promise<void>;
  openFile: (fileHandle: FileSystemFileHandle, providedPath?: string, force?: boolean) => Promise<void>;
}

interface VaultDirectory {
  handle: FileSystemDirectoryHandle;
  path: string;
}

const NEW_FOLDER_VALUE = "__new_folder__";
const ROOT_VALUE = "__root__";

export function useCreateItem({ scanVault, indexVaultTags, openFile }: UseCreateItemProps) {
  const [vaultHandle] = useAtom(atom_vaultHandle);
  const [currentDirectoryHandle] = useAtom(atom_currentDirectoryHandle);
  const dialog = useDialog();

  const listVaultDirectories = useCallback(async () => {
    if (!vaultHandle) return null;

    const directories: VaultDirectory[] = [];
    try {
      const visit = async (parent: FileSystemDirectoryHandle, parentPath: string): Promise<void> => {
        for await (const entry of (parent as any).values()) {
          if (entry.kind !== "directory" || entry.name.startsWith(".")) continue;
          const path = parentPath ? `${parentPath}/${entry.name}` : entry.name;
          directories.push({ handle: entry, path });
          await visit(entry, path);
        }
      };
      await visit(vaultHandle, "");
    } catch (err: any) {
      console.error("Failed to list vault folders:", err?.message || err);
      toast.error("Failed to load folders.");
      return null;
    }
    return directories.sort((a, b) => a.path.localeCompare(b.path));
  }, [vaultHandle]);

  const selectTargetDirectory = useCallback(async (
    message: string,
    title: string,
    includeNewFolder = false,
  ): Promise<FileSystemDirectoryHandle | typeof NEW_FOLDER_VALUE | null> => {
    if (!vaultHandle) return null;
    const directories = await listVaultDirectories();
    if (!directories) return null;
    const options = [
      { label: `/ ${vaultHandle.name} (root)`, value: ROOT_VALUE },
      ...directories.map(({ path }) => ({ label: path, value: `path:${path}` })),
      ...(includeNewFolder ? [{ label: "+ New Folder", value: NEW_FOLDER_VALUE }] : []),
    ];
    const chosen = await dialog.select(message, options, title);
    if (!chosen) return null;
    if (chosen === ROOT_VALUE) return vaultHandle;
    if (chosen === NEW_FOLDER_VALUE) return NEW_FOLDER_VALUE;
    return directories.find(({ path }) => `path:${path}` === chosen)?.handle ?? null;
  }, [dialog, listVaultDirectories, vaultHandle]);

  const promptAndCreateFolder = useCallback(async (targetDirectory: FileSystemDirectoryHandle) => {
    if (!vaultHandle) return null;
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

  const chooseTargetDirectory = useCallback(async () => {
    const target = await selectTargetDirectory(
      "Choose a folder for the new file:",
      "New File",
      true,
    );
    if (target !== NEW_FOLDER_VALUE) return target;

    const parent = await selectTargetDirectory(
      "Choose a destination for the new folder:",
      "New Folder",
    );
    if (!parent || parent === NEW_FOLDER_VALUE) return null;
    return promptAndCreateFolder(parent);
  }, [promptAndCreateFolder, selectTargetDirectory]);

  const createFile = useCallback(
    async (name: string, content: string = "", dirOverride?: FileSystemDirectoryHandle) => {
      const targetDir = dirOverride || currentDirectoryHandle || vaultHandle;
      if (!targetDir) return null;

      const trimmedName = name.trim();
      if (!trimmedName) return null;
      if (/[\\/]/.test(trimmedName)) {
        toast.error("File names cannot contain slashes.");
        return null;
      }

      const baseName = trimmedName.endsWith(".md") ? trimmedName.slice(0, -3) : trimmedName;

      try {
        const { handle: newFileHandle, fileName } = await createUniqueFile(targetDir, baseName);

        // Write content immediately if provided.
        // If empty, pad with a newline to prevent creating a 0-byte file,
        // which causes Google Drive to hang in an infinite sync loop.
        let contentToWrite = content;
        if (!contentToWrite) contentToWrite = "\n";
        await withRetry(() => writeFileContent(newFileHandle!, contentToWrite));

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

    try {
      const { handle: newFileHandle, fileName } = await createUniqueFile(targetDir, baseName);
      await withRetry(() => writeFileContent(newFileHandle, "\n"));
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

  // A target directory (e.g. from a folder's menu in the file tree) skips the
  // folder picker. The kind check guards against callers that forward an
  // event object as the first argument.
  const createNewFile = useCallback(async (targetDirectory?: FileSystemDirectoryHandle) => {
    if (!vaultHandle) return;

    const targetDir = targetDirectory?.kind === "directory"
      ? targetDirectory
      : await chooseTargetDirectory();
    if (!targetDir) return;

    const name = await dialog.prompt("Enter file name:", "Untitled", "New File");
    if (!name?.trim()) return;

    return createFile(name.trim(), "", targetDir);
  }, [vaultHandle, chooseTargetDirectory, createFile, dialog]);

  const createFolder = useCallback(async (parentDirectory?: FileSystemDirectoryHandle) => {
    if (parentDirectory?.kind === "directory") return promptAndCreateFolder(parentDirectory);
    const targetDirectory = await selectTargetDirectory(
      "Choose a destination for the new folder:",
      "New Folder",
    );
    if (!targetDirectory || targetDirectory === NEW_FOLDER_VALUE) return null;
    return promptAndCreateFolder(targetDirectory);
  }, [promptAndCreateFolder, selectTargetDirectory]);

  return {
    chooseTargetDirectory,
    createFile,
    createWikiLinkFile,
    createNewFile,
    createFolder,
  };
}
