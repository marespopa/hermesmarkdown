"use client";

import { useAtomValue } from "jotai";
import {
  atom_activeFileHandle,
} from "@/app/atoms/atoms";
import { useOpenFile } from "./use-open-file";
import { useSaveFile } from "./use-save-file";
import { useExportFile } from "./use-export-file";
import { useIndexActiveFile } from "./use-index-active-file";

interface UseFileEditorProps {
  indexVaultTags: (passedHandle?: FileSystemDirectoryHandle) => Promise<void>;
}

/**
 * Main hook for File Editor operations.
 * Composes specialized hooks for opening, saving, exporting, and background indexing.
 */
export function useFileEditor({ indexVaultTags }: UseFileEditorProps) {
  const activeFileHandle = useAtomValue(atom_activeFileHandle);
  
  const { openFile, openFileByName } = useOpenFile();
  const { saveFile } = useSaveFile({ indexVaultTags });
  const { exportFile } = useExportFile({ saveFile });
  
  // Register background indexing
  useIndexActiveFile();

  return {
    activeFileHandle,
    openFile,
    saveFile,
    exportFile,
    openFileByName,
  };
}
