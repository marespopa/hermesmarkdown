"use client";

import { useCallback } from "react";
import { useSetAtom, useStore } from "jotai";
import { atom_activeFileHandle, atom_activeFilePath, atom_openFiles } from "@/app/atoms/file-atoms";
import { atom_isFileLoading, atom_openingFilePath, atom_verifyingNotePath } from "@/app/atoms/ui-atoms";
import { recordPerfAfterPaint } from "@/app/utils/perf/perf-metrics";
import { takePrefetched } from "./note-prefetch";
import { browserOnlyEditOf, openedFromDisk } from "./open-merge";

// Brings a note that's already open to the front at once, from memory, then
// checks the file's modified time behind it (a metadata read, no text).
// - Unchanged: nothing else happens; the text, caret and any unsaved edits
//   stay as they are (autosave writes them as usual).
// - Changed on disk: the disk text replaces it (disk wins); unsaved browser
//   text that differs is kept as a "local" snapshot, as a full open does.
// Until the check is done the note's editor takes no typing
// (atom_verifyingNotePath), so a replacement never loses a keystroke; the
// delayed loading bar shows only if it takes long. Resolves false when the
// file couldn't be read, for the caller's full open (with its retries).
export function useShowOpenNoteAtOnce() {
  const store = useStore();
  const setActiveFilePath = useSetAtom(atom_activeFilePath);
  const setActiveFileHandle = useSetAtom(atom_activeFileHandle);
  const setVerifyingPath = useSetAtom(atom_verifyingNotePath);
  const setOpeningFilePath = useSetAtom(atom_openingFilePath);
  const setIsFileLoading = useSetAtom(atom_isFileLoading);

  return useCallback(async (handle: FileSystemFileHandle, path: string, knownModified: number, startedAt: number): Promise<boolean> => {
    setVerifyingPath(path);
    setActiveFilePath(path);
    setActiveFileHandle(handle);
    setOpeningFilePath((current) => (current === path ? null : current));
    recordPerfAfterPaint("note-open", startedAt);
    setIsFileLoading(true);
    try {
      const file = await handle.getFile();
      if (file.lastModified !== knownModified) {
        const text = takePrefetched(path, file) ?? await file.text();
        store.set(atom_openFiles, (prev) => {
          const current = prev[path];
          if (!current) return prev;
          return { ...prev, [path]: openedFromDisk(current, path, handle.name, text, file.lastModified, browserOnlyEditOf(current)) };
        });
      }
      return true;
    } catch {
      return false;
    } finally {
      setVerifyingPath((current) => (current === path ? null : current));
      setIsFileLoading(false);
    }
  }, [store, setActiveFilePath, setActiveFileHandle, setVerifyingPath, setOpeningFilePath, setIsFileLoading]);
}
