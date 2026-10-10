"use client";

import { useCreateItem } from "./use-create-item";
import { useDeleteItem } from "./use-delete-item";
import { useRenameItem } from "./use-rename-item";
import { useDuplicateItem } from "./use-duplicate-item";
import { useMoveItem } from "./use-move-item";
import { useImportItem } from "./use-import-item";
import { useTemplateNotes } from "./use-template-notes";
import { useTemplateCreate } from "./use-template-create";
import { useTemplateSave } from "./use-template-save";
import { useOpenOrCreateLink } from "./use-open-or-create-link";
import { useFileUndo } from "./use-file-undo";

interface UseFileCrudProps {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: (passedHandle?: FileSystemDirectoryHandle) => Promise<void>;
  openFile: (fileHandle: FileSystemFileHandle, providedPath?: string, force?: boolean) => Promise<void>;
}

/**
 * Main hook for File System CRUD operations.
 * Composes specialized hooks for creation, deletion (to the vault's Trash),
 * renaming, moving, importing, notes created from vault templates, and the
 * undo of renames, moves and moves to Trash.
 */
export function useFileCrud({ scanVault, indexVaultTags, openFile }: UseFileCrudProps) {
  const { recordUndo, undoFileOperation } = useFileUndo({ scanVault, indexVaultTags });

  const { chooseTargetDirectory, createFile, createWikiLinkFile, createNewFile, createFolder } = useCreateItem({
    scanVault,
    indexVaultTags,
    openFile,
  });

  const { deleteFile, trashItems } = useDeleteItem({
    scanVault,
    indexVaultTags,
    recordUndo,
    undoFileOperation,
  });

  const { renameFile } = useRenameItem({
    scanVault,
    indexVaultTags,
    recordUndo,
  });

  const { duplicateFile } = useDuplicateItem({
    scanVault,
    indexVaultTags,
    openFile,
  });

  const { moveItem, moveItems } = useMoveItem({
    scanVault,
    indexVaultTags,
    recordUndo,
    undoFileOperation,
  });

  const { importFile } = useImportItem({
    openFile,
  });

  const { readTemplate, instantiate } = useTemplateNotes();
  const { createNoteFromMissingLink, createNoteFromTemplate, createTemplate, createLinkedNoteFromTemplate, openTodayNote } = useTemplateCreate({
    scanVault,
    indexVaultTags,
    openFile,
  });
  const { openOrCreateLink } = useOpenOrCreateLink({ openFile, createNoteFromMissingLink });
  const saveAsTemplate = useTemplateSave({ scanVault });

  return {
    chooseTargetDirectory,
    createFile,
    createWikiLinkFile,
    createNewFile,
    createFolder,
    deleteFile,
    trashItems,
    renameFile,
    duplicateFile,
    moveItem,
    moveItems,
    undoFileOperation,
    importFile,
    readTemplate,
    instantiate,
    createNoteFromMissingLink,
    createNoteFromTemplate,
    createTemplate,
    createLinkedNoteFromTemplate,
    openTodayNote,
    saveAsTemplate,
    openOrCreateLink,
  };
}
