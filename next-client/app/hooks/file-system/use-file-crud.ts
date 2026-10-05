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

interface UseFileCrudProps {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: (passedHandle?: FileSystemDirectoryHandle) => Promise<void>;
  openFile: (fileHandle: FileSystemFileHandle, providedPath?: string, force?: boolean) => Promise<void>;
}

/**
 * Main hook for File System CRUD operations.
 * Composes specialized hooks for creation, deletion, renaming, moving,
 * importing, and notes created from vault templates.
 */
export function useFileCrud({ scanVault, indexVaultTags, openFile }: UseFileCrudProps) {
  const { chooseTargetDirectory, createFile, createWikiLinkFile, createNewFile, createFolder } = useCreateItem({
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

  const { duplicateFile } = useDuplicateItem({
    scanVault,
    indexVaultTags,
    openFile,
  });

  const { moveItem } = useMoveItem({
    scanVault,
    indexVaultTags,
  });

  const { importFile } = useImportItem({
    openFile,
  });

  const { readTemplate, instantiate } = useTemplateNotes();
  const { createNoteFromMissingLink, createNoteFromTemplate, createTemplate, createLinkedNoteFromTemplate } = useTemplateCreate({
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
    renameFile,
    duplicateFile,
    moveItem,
    importFile,
    readTemplate,
    instantiate,
    createNoteFromMissingLink,
    createNoteFromTemplate,
    createTemplate,
    createLinkedNoteFromTemplate,
    saveAsTemplate,
    openOrCreateLink,
  };
}
