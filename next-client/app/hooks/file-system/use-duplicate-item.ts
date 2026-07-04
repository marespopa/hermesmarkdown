"use client";

import { useAtom } from "jotai";
import { useCallback } from "react";
import toast from "react-hot-toast";
import { atom_vaultHandle } from "@/app/atoms/atoms";
import { useDialog } from "../use-dialog";
import { withRetry } from "./shared";

interface UseDuplicateItemProps {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: (passedHandle?: FileSystemDirectoryHandle) => Promise<void>;
  openFile: (fileHandle: FileSystemFileHandle, providedPath?: string, force?: boolean) => Promise<void>;
}

export function useDuplicateItem({ scanVault, indexVaultTags, openFile }: UseDuplicateItemProps) {
  const [vaultHandle] = useAtom(atom_vaultHandle);
  const dialog = useDialog();

  const duplicateFile = useCallback(
    async (handle: FileSystemHandle) => {
      if (!vaultHandle || handle.kind !== "file") return;

      const currentBaseName = handle.name.endsWith(".md") ? handle.name.slice(0, -3) : handle.name;

      // Same folder-picker used by "New File", so the duplicate can be placed
      // in a different folder instead of always landing next to the original.
      const subDirs: FileSystemDirectoryHandle[] = [];
      for await (const entry of (vaultHandle as any).values()) {
        if (entry.kind === "directory" && !entry.name.startsWith(".")) {
          subDirs.push(entry);
        }
      }
      subDirs.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

      const options = [
        { label: `/ ${vaultHandle.name} (root)`, value: "__root__" },
        ...subDirs.map((d) => ({ label: d.name, value: d.name })),
        { label: "+ New Folder", value: "__new_folder__" },
      ];
      const chosen = await dialog.select("Choose a folder for the duplicate:", options, "Duplicate File");
      if (!chosen) return;

      let parentDir: FileSystemDirectoryHandle = vaultHandle;
      if (chosen === "__new_folder__") {
        const folderName = await dialog.prompt("Enter folder name:", "", "New Folder");
        if (!folderName) return;
        try {
          parentDir = await withRetry(() => vaultHandle.getDirectoryHandle(folderName, { create: true }));
          await scanVault(vaultHandle);
        } catch (err: any) {
          console.error("File System Error:", err?.message || err);
          toast.error("Failed to create folder");
          return;
        }
      } else if (chosen !== "__root__") {
        const found = subDirs.find((d) => d.name === chosen);
        if (found) parentDir = found;
      }

      const enteredName = await dialog.prompt(
        "Enter name for duplicate:",
        `${currentBaseName} copy`,
        "Duplicate File",
      );
      if (!enteredName) return;

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
    [vaultHandle, scanVault, indexVaultTags, openFile, dialog],
  );

  return { duplicateFile };
}
