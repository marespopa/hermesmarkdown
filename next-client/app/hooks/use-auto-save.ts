"use client";

import { useAtom } from "jotai";
import {
  atom_activeFileHandle,
  atom_content,
  atom_lastSavedContent,
  atom_autosaveMode,
  atom_autosaveDelay,
  atom_activeFilePath,
} from "@/app/atoms/atoms";
import { useEffect, useRef, useCallback } from "react";
import { useFileSystem } from "./use-file-system";

/**
 * Hook to handle auto-saving content to the active file.
 * Supports different modes: afterDelay (debounced), onFocusChange, and manual.
 */
export function useAutoSave(onDraftChange?: () => void) {
  const [activeFileHandle] = useAtom(atom_activeFileHandle);
  const [content] = useAtom(atom_content);
  const [lastSavedContent] = useAtom(atom_lastSavedContent);
  const [autosaveMode] = useAtom(atom_autosaveMode);
  const [autosaveDelay] = useAtom(atom_autosaveDelay);
  const [activeFilePath] = useAtom(atom_activeFilePath);
  
  const { saveFile } = useFileSystem();
  
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

    if (autosaveMode !== "manual" && content !== lastSavedContent && activeFileHandle) {
      await saveFile(content, undefined, 0, true);
    }
  }, [content, lastSavedContent, activeFileHandle, saveFile, autosaveMode]);

  useEffect(() => {
    // 1. Handle Focus Change (Switching files or tabs)
    if (prevFilePathRef.current !== activeFilePath) {
      // Save the PREVIOUS file if it was dirty before we switched
      // We do this regardless of mode now to ensure no data is left unsynced on switch
      if (prevContentRef.current !== prevLastSavedContentRef.current && prevHandleRef.current) {
        saveFile(prevContentRef.current, prevHandleRef.current, 0, true, prevFilePathRef.current || undefined);
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
    }, autosaveDelay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    content, 
    lastSavedContent, 
    activeFileHandle, 
    saveFile, 
    autosaveMode, 
    autosaveDelay, 
    activeFilePath, 
    onDraftChange
  ]);

  // 3. Handle Window Blur (External focus change)
  useEffect(() => {
    const handleBlur = () => {
      if (autosaveMode === "onFocusChange") {
        flush();
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Use refs to check current state without needing content in dependency array
      if (prevContentRef.current !== prevLastSavedContentRef.current) {
        e.preventDefault();
        e.returnValue = ""; // Standard way to trigger the browser's "Unsaved changes" dialog
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [autosaveMode, flush]); // Dependency array size reverted to original to fix HMR error

  return { flush };
}
