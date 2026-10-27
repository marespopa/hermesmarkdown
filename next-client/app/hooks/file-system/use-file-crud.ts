"use client";

import { useCallback } from "react";
import { useCreateItem } from "./use-create-item";
import { useDeleteItem } from "./use-delete-item";
import { useRenameItem } from "./use-rename-item";
import { useDuplicateItem } from "./use-duplicate-item";
import { useMoveItem } from "./use-move-item";
import { useImportItem } from "./use-import-item";
import { useTemplateNotes } from "./use-template-notes";
import { useTemplateCreate } from "./use-template-create";
import { useTemplateSave } from "./use-template-save";
import { useFolderTemplate } from "./use-folder-template";
import { useTemplateWizard } from "./use-template-wizard";
import { useOpenOrCreateLink } from "./use-open-or-create-link";
import { useOpenFileLink } from "./use-open-file-link";
import { useFileUndo } from "./use-file-undo";
import { useHeldSync } from "./use-held-sync";

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

  const { chooseTargetDirectory, createFile, createNewFile, createFolder } = useCreateItem({
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
  const {
    writeNewNote,
    createNoteFromMissingLink,
    createTemplate: createTemplateFile,
    createWikiLinkFile,
    createLinkedNoteFromTemplate,
    createNoteFromTemplate,
    createLinkedBoard,
  } = useTemplateCreate({
    scanVault,
    indexVaultTags,
    openFile,
  });
  const { openOrCreateLink } = useOpenOrCreateLink({ openFile, createNoteFromMissingLink });
  const { openFileLink } = useOpenFileLink({ openFile });
  const saveAsTemplate = useTemplateSave({ scanVault });
  // Not in `held`: it holds the sync itself, for writes that outlive its promise.
  const { newFromFolderTemplate } = useFolderTemplate({ scanVault, indexVaultTags, openFile });
  const { newTemplate } = useTemplateWizard({ scanVault, indexVaultTags, openFile, createTemplate: createTemplateFile });
  // "New template…" with nothing given opens the template wizard; a pack's
  // New template (`pack`) and a copy of a built-in (`from`) write the file.
  const createTemplate = useCallback(
    (pack?: string, from?: { name: string; body: string }) =>
      (pack === undefined && from === undefined ? newTemplate() : createTemplateFile(pack, from)),
    [newTemplate, createTemplateFile],
  );

  // Operations that change the vault's files hold the background sync
  // (vault-sync-hold.ts) until they're done.
  const held = {
    createFile: useHeldSync(createFile),
    createNewFile: useHeldSync(createNewFile),
    createFolder: useHeldSync(createFolder),
    deleteFile: useHeldSync(deleteFile),
    trashItems: useHeldSync(trashItems),
    renameFile: useHeldSync(renameFile),
    duplicateFile: useHeldSync(duplicateFile),
    moveItem: useHeldSync(moveItem),
    moveItems: useHeldSync(moveItems),
    undoFileOperation: useHeldSync(undoFileOperation),
  };

  return {
    chooseTargetDirectory,
    ...held,
    createWikiLinkFile,
    importFile,
    readTemplate,
    instantiate,
    createNoteFromMissingLink,
    createTemplate,
    createLinkedNoteFromTemplate,
    createNoteFromTemplate,
    createLinkedBoard,
    writeNewNote,
    saveAsTemplate,
    newFromFolderTemplate,
    openOrCreateLink,
    openFileLink,
  };
}
