"use client";

import { useAtomValue } from "jotai";
import {
  atom_activeFileHandle,
} from "@/app/atoms/atoms";
import { useOpenFile } from "./use-open-file";
import { useSaveFile } from "./use-save-file";
import { useExportFile } from "./use-export-file";

/**
 * Main hook for File Editor operations.
 * Composes specialized hooks for opening, saving and exporting. Background
 * indexing of the active note runs once, in ActiveFileIndexer.
 */
export function useFileEditor() {
  const activeFileHandle = useAtomValue(atom_activeFileHandle);

  const { openFile, openFileByName } = useOpenFile();
  const { saveFile } = useSaveFile();
  const { exportFile } = useExportFile({ saveFile });

  return {
    activeFileHandle,
    openFile,
    saveFile,
    exportFile,
    openFileByName,
  };
}
