"use client";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import toast from "react-hot-toast";
import {
  atom_vaultHandle,
  atom_currentDirectoryHandle,
  atom_autoInjectFrontmatter,
  atom_vaultSetupStatus,
} from "@/app/atoms/atoms";
import { atom_frontmatterWizardOpen, atom_vaultSetupWizardOpen } from "@/app/atoms/ui-atoms";
import { useDialog } from "../use-dialog";
import { withRetry } from "./shared";
import { injectFrontmatter } from "@/app/utils/frontmatterInjector";

interface UseCreateItemProps {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  openFile: (fileHandle: FileSystemFileHandle, providedPath?: string, force?: boolean) => Promise<void>;
}

export function useCreateItem({ scanVault, openFile }: UseCreateItemProps) {
  const [vaultHandle] = useAtom(atom_vaultHandle);
  const [currentDirectoryHandle] = useAtom(atom_currentDirectoryHandle);
  const [autoInjectFrontmatter] = useAtom(atom_autoInjectFrontmatter);
  const setFrontmatterWizardOpen = useSetAtom(atom_frontmatterWizardOpen);
  const setVaultSetupWizardOpen = useSetAtom(atom_vaultSetupWizardOpen);
  const vaultSetupStatus = useAtomValue(atom_vaultSetupStatus);
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

        // Write content immediately if provided.
        // If empty, pad with a newline to prevent creating a 0-byte file,
        // which causes Google Drive to hang in an infinite sync loop.
        let contentToWrite = autoInjectFrontmatter
          ? injectFrontmatter(content, fileName)
          : content;
        if (!contentToWrite) contentToWrite = "\n";
        await withRetry(async () => {
          const writable = await (newFileHandle as any).createWritable();
          await writable.write(contentToWrite);
          await writable.close();
        });

        await scanVault(targetDir);

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

        if (contentToWrite !== content) {
          if (vaultSetupStatus === "needs_setup") {
            setVaultSetupWizardOpen(path);
          } else {
            setFrontmatterWizardOpen(path);
          }
        }

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
    [vaultHandle, currentDirectoryHandle, scanVault, openFile, autoInjectFrontmatter, vaultSetupStatus, setVaultSetupWizardOpen, setFrontmatterWizardOpen],
  );

  const createNewFile = useCallback(async (dirHandle?: FileSystemDirectoryHandle) => {
    if (!vaultHandle) return;

    let targetDir: FileSystemDirectoryHandle = dirHandle || vaultHandle;

    // Only show folder picker when called from the header (no dirHandle)
    if (!dirHandle) {
      // Read the vault root's subdirectories directly rather than relying on
      // vaultFiles, which reflects whatever directory was last scanned (e.g.
      // a subfolder from Content navigation) and can be stale/empty in Views.
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
      const chosen = await dialog.select("Choose a folder for the new file:", options, "New File");
      if (!chosen) return;

      if (chosen === "__new_folder__") {
        const folderName = await dialog.prompt("Enter folder name:", "", "New Folder");
        if (!folderName) return;
        try {
          const newDir = await withRetry(() =>
            vaultHandle.getDirectoryHandle(folderName, { create: true })
          );
          await scanVault(vaultHandle);
          targetDir = newDir;
        } catch (err: any) {
          console.error("File System Error:", err?.message || err);
          toast.error("Failed to create folder");
          return;
        }
      } else if (chosen !== "__root__") {
        const found = subDirs.find((d) => d.name === chosen);
        if (found) targetDir = found;
      }
    }

    const result = await dialog.newFile();
    if (!result || !result.name) return;

    const slug = result.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const tagsStr = result.tags 
      ? `[${result.tags.split(",").map((t: string) => t.trim().toLowerCase()).filter(Boolean).join(", ")}]` 
      : "[]";
    const fm = `---\nid: ${slug}\ntitle: ${result.name}\ntype: ${result.type || "note"}\nstatus: "#draft"\ntags: ${tagsStr}\n---\n\n`;

    return await createFile(result.name, fm, targetDir);
  }, [vaultHandle, scanVault, createFile, dialog]);

  return {
    createFile,
    createNewFile,
  };
}
