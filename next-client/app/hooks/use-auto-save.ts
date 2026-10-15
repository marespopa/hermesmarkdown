"use client";

import { useAtom, useStore } from "jotai";
import {
  atom_activeFileHandle,
  atom_content,
  atom_lastSavedContent,
  atom_autosaveMode,
  AUTOSAVE_DELAY,
  atom_activeFilePath,
  atom_openFiles,
} from "@/app/atoms/atoms";
import { useEffect, useRef, useCallback } from "react";
import { useFileSystem } from "./use-file-system";
import { flushAllBoardWrites } from "@/app/utils/board/board-flush";

/**
 * Hook to handle auto-saving content to the active file.
 * Supports two modes: afterDelay (debounced) and manual.
 */
export function useAutoSave(onDraftChange?: () => void) {
  const [activeFileHandle] = useAtom(atom_activeFileHandle);
  const [content] = useAtom(atom_content);
  const [lastSavedContent] = useAtom(atom_lastSavedContent);
  const [autosaveMode] = useAtom(atom_autosaveMode);
  const [activeFilePath] = useAtom(atom_activeFilePath);
  
  const { saveFile } = useFileSystem();
  const store = useStore();
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track previous values to detect focus/tab changes
  const prevFilePathRef = useRef(activeFilePath);
  const prevContentRef = useRef(content);
  const prevHandleRef = useRef(activeFileHandle);
  const prevLastSavedContentRef = useRef(lastSavedContent);

  /**
   * Immediately flushes any pending saves.
   */
  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // A board's debounced stroke goes into the store first; read from there.
    flushAllBoardWrites();
    const currentContent = store.get(atom_content);
    const currentSaved = store.get(atom_lastSavedContent);

    if (autosaveMode !== "manual" && currentContent !== currentSaved && activeFileHandle) {
      await saveFile(currentContent, undefined, 0, true);
    }
  }, [activeFileHandle, saveFile, autosaveMode, store]);

  useEffect(() => {
    // 1. Handle Focus Change (Switching files or tabs)
    if (prevFilePathRef.current !== activeFilePath) {
      // Save the PREVIOUS file if it was dirty before we switched
      // We do this regardless of mode now to ensure no data is left unsynced on switch
      // Read the previous tab from the store: a board's flushed stroke is
      // newer than anything this hook has rendered.
      const prevState = prevFilePathRef.current ? store.get(atom_openFiles)[prevFilePathRef.current] : undefined;
      const prevContent = prevState?.content ?? prevContentRef.current;
      const prevSaved = prevState?.lastSavedContent ?? prevLastSavedContentRef.current;
      if (prevContent !== prevSaved && prevHandleRef.current) {
        saveFile(prevContent, prevHandleRef.current, 0, true, prevFilePathRef.current || undefined);
      }
      
      // Clear any pending debounced save for the file we just left
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    // Update tracking refs for the next effect run
    prevFilePathRef.current = activeFilePath;
    prevContentRef.current = content;
    prevHandleRef.current = activeFileHandle;
    prevLastSavedContentRef.current = lastSavedContent;

    // 2. Handle "afterDelay" (Debounced) mode
    if (autosaveMode !== "afterDelay" || content === lastSavedContent) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Debounce the save operation
    if (timerRef.current) clearTimeout(timerRef.current);
    
    timerRef.current = setTimeout(async () => {
      // Re-verify content hasn't been saved in the meantime
      if (content !== lastSavedContent) {
        if (activeFileHandle) {
          await saveFile(content, undefined, 0, true);
        } else if (onDraftChange) {
          onDraftChange();
        }
      }
    }, AUTOSAVE_DELAY);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    content, 
    lastSavedContent, 
    activeFileHandle, 
    saveFile, 
    autosaveMode, 
    activeFilePath,
    onDraftChange,
    store
  ]);

  return { flush };
}
