"use client";

import { useCreateItem } from "./use-create-item";
import { useDeleteItem } from "./use-delete-item";
import { useRenameItem } from "./use-rename-item";
import { useMoveItem } from "./use-move-item";
import { useImportItem } from "./use-import-item";

interface UseFileCrudProps {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: (passedHandle?: FileSystemDirectoryHandle) => Promise<void>;
  openFile: (fileHandle: FileSystemFileHandle, providedPath?: string, force?: boolean) => Promise<void>;
}

/**
 * Main hook for File System CRUD operations.
 * Composes specialized hooks for creation, deletion, renaming, moving, and importing.
 */
export function useFileCrud({ scanVault, indexVaultTags, openFile }: UseFileCrudProps) {
  const { createFile, createNewFile } = useCreateItem({
    scanVault,
    indexVaultTags,
    openFile,
  });

  const { deleteFile } = useDeleteItem({
    scanVault,
    indexVaultTags,
  });

  const { renameFile } = useRenameItem({
    scanVault,
    indexVaultTags,
  });

  const { moveItem } = useMoveItem({
    scanVault,
    indexVaultTags,
  });

  const { importFile } = useImportItem({
    openFile,
  });

  return {
    createFile,
    createNewFile,
    deleteFile,
    renameFile,
    moveItem,
    importFile,
  };
}
