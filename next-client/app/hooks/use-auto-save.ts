"use client";

import { useAtom } from "jotai";
import {
  atom_activeFileHandle,
  atom_content,
  atom_lastSavedContent,
  atom_isAutoSaveEnabled,
} from "@/app/atoms/atoms";
import { useEffect, useRef } from "react";
import { useFileSystem } from "./use-file-system";

const AUTO_SAVE_DEBOUNCE = 1500; // 1.5 seconds

/**
 * Hook to handle auto-saving content to the active file.
 * It debounces changes and calls saveFile when content differs from lastSavedContent.
 */
export function useAutoSave() {
  const [activeFileHandle] = useAtom(atom_activeFileHandle);
  const [content] = useAtom(atom_content);
  const [lastSavedContent] = useAtom(atom_lastSavedContent);
  const [isAutoSaveEnabled] = useAtom(atom_isAutoSaveEnabled);
  const { saveFile } = useFileSystem();
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only auto-save if enabled, we have a file handle, and content has actually changed
    if (!isAutoSaveEnabled || !activeFileHandle || content === lastSavedContent) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Debounce the save operation
    if (timerRef.current) clearTimeout(timerRef.current);
    
    timerRef.current = setTimeout(async () => {
      // Re-verify content hasn't been saved in the meantime (e.g. by a focus event)
      if (content !== lastSavedContent) {
        await saveFile(content, undefined, 0, true);
      }
    }, AUTO_SAVE_DEBOUNCE);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [content, lastSavedContent, activeFileHandle, saveFile, isAutoSaveEnabled]);
}
