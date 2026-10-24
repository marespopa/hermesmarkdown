"use client";

import { useCallback } from "react";
import toast from "react-hot-toast";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { resolveDirectory } from "@/app/hooks/file-system/vault-scan";

// FolderPopover's New File / New Folder (the pane title's breadcrumb and the
// sidebar's pinned folders): named there, created in its folder with no
// picker or prompt. A new note opens; a new folder's path goes back so the
// popover steps into it.
export function useFolderCreateActions() {
  const { vaultHandle, createNewFile, createFolder } = useFileSystem();

  const folderAt = useCallback(async (folder: string) => {
    const dir = vaultHandle ? await resolveDirectory(vaultHandle, folder) : null;
    if (!dir) toast.error("That folder is no longer in the vault.");
    return dir;
  }, [vaultHandle]);

  const newNoteIn = useCallback(async (folder: string, name: string) => {
    const dir = await folderAt(folder);
    if (dir) await createNewFile(dir, name);
  }, [folderAt, createNewFile]);

  const newFolderIn = useCallback(async (folder: string, name: string) => {
    const dir = await folderAt(folder);
    const created = dir ? await createFolder(dir, name) : null;
    return created ? (folder ? `${folder}/${created.name}` : created.name) : null;
  }, [folderAt, createFolder]);

  return { newNoteIn, newFolderIn };
}
