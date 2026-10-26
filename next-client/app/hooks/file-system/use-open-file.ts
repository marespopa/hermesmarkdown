"use client";

import { useAtom, useSetAtom } from "jotai";
import { useCallback } from "react";
import toast from "react-hot-toast";
import {
  atom_vaultHandle,
  atom_activeFileHandle,
  atom_activeFilePath,
  atom_content,
  atom_lastSavedContent,
  atom_fileConflict,
  atom_openFiles,
  contentStore,
} from "@/app/atoms/atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { isOpenNotesHydrated, whenOpenNotesHydrated } from "@/app/atoms/file-atoms";
import { atom_isFileLoading, atom_openingFilePath } from "@/app/atoms/ui-atoms";
import { nextPaint } from "@/app/utils/next-paint";
import { recordPerf } from "@/app/utils/perf/perf-metrics";
import { useDialog } from "../use-dialog";
import { resolveFileMetaByName } from "./resolve-file-by-name";
import { takePrefetched } from "./note-prefetch";
import { browserOnlyEditOf, openedFromDisk } from "./open-merge";
import { useShowOpenNoteAtOnce } from "./use-show-open-note";

export function useOpenFile() {
  const [vaultHandle] = useAtom(atom_vaultHandle);
  const [, setActiveFileHandle] = useAtom(atom_activeFileHandle);
  const [activeFilePath, setActiveFilePath] = useAtom(atom_activeFilePath);
  const [fileMetadata] = useAtom(atom_fileMetadata);
  const setOpenFiles = useSetAtom(atom_openFiles);
  const [lastSavedContent] = useAtom(atom_lastSavedContent);
  const [, setFileConflict] = useAtom(atom_fileConflict);
  const [, setIsFileLoading] = useAtom(atom_isFileLoading);
  const setOpeningFilePath = useSetAtom(atom_openingFilePath);
  const dialog = useDialog();
  const showOpenNoteAtOnce = useShowOpenNoteAtOnce();

  const openFile = useCallback(
    async (
      fileHandle: FileSystemFileHandle,
      providedPath?: string,
      force: boolean = false,
      retryCount = 0,
      openStartedAt = performance.now(),
    ) => {
      let path = providedPath || (fileHandle as any).path;
      if (!path && vaultHandle) {
        // 1. Try to find the path in metadata first (fastest fallback)
        for (const [metaPath, meta] of Object.entries(fileMetadata)) {
          if (meta.name === fileHandle.name) {
            try {
              if (await (meta.handle as any).isSameEntry(fileHandle)) {
                path = metaPath;
                break;
              }
            } catch {
              // Comparison failed
            }
          }
        }
        
        // 2. If still no path, use the slow File System API resolve
        if (!path) {
          try {
            const pathParts = await (vaultHandle as any).resolve(fileHandle);
            if (pathParts) {
              path = pathParts.join("/");
            }
          } catch {
            // resolve failed, path stays null
          }
        }
      }

      const finalPath = path || fileHandle.name;
      // Optimistic: the pane and the sidebar switch to it now, before the read.
      setOpeningFilePath(finalPath);
      // Only this open's own mark is cleared (a newer open may have taken over).
      const clearOpening = () => setOpeningFilePath((current) => (current === finalPath ? null : current));

      // The note's stored text must be in before it's compared with disk.
      if (!isOpenNotesHydrated()) await whenOpenNotesHydrated();

      // 0. Saved content on disk always wins when (re)opening a file. If the
      // browser holds different, unsaved text for it, that text is kept as a
      // "local" snapshot on the tab (recoverable) instead of prompting.
      const existing = contentStore.get(atom_openFiles)[finalPath];
      const browserOnlyEdit = browserOnlyEditOf(existing);

      // The CURRENT active file being dirty is only a concern when it's the
      // draft, which has no file on disk to fall back to.
      // Read when opening, not subscribed: a subscription would re-render
      // every useFileSystem caller on each keystroke.
      const content = contentStore.get(atom_content);
      if (!force && !browserOnlyEdit && (!activeFilePath || activeFilePath === "draft") && content !== lastSavedContent) {
        const confirmed = await dialog.confirm(
          "You have unsaved changes in your draft. Open this file and discard them?",
          "Unsaved Changes",
          "Open File",
          "Cancel",
          "You can save your draft first to avoid losing work.",
        );
        if (!confirmed) {
          clearOpening();
          return;
        }
      }

      // A note already open, with its disk time known, comes to the front
      // at once from memory; a cheap check of the file's time runs behind it.
      if (!force && retryCount === 0 && existing?.lastModified !== undefined
        && await showOpenNoteAtOnce(fileHandle, finalPath, existing.lastModified, openStartedAt)) {
        return;
      }

      try {
        setIsFileLoading(true);
        const file = await fileHandle.getFile();
        // Read ahead on hover / highlight (note-prefetch.ts), if unchanged since.
        const fileContent = takePrefetched(finalPath, file) ?? await file.text();

        // 1. Update openFiles registry first so the pane has data to read (persisted fields only)
        setOpenFiles((prev) => ({
          ...prev,
          [finalPath]: openedFromDisk(prev[finalPath], finalPath, fileHandle.name, fileContent, file.lastModified, browserOnlyEdit),
        }));

        // 2. Switch active path. The
        // sidebar stays as it is: it's put away only when asked.
        setActiveFilePath(finalPath);

        // 3. Store the "live" handle separately (non-persisted)
        setActiveFileHandle(fileHandle);

        // 4. Update non-file-specific state
        setFileConflict(null);

        // 5. Keep the loading indicator up until the editor has rendered the
        // new file — for large notes that render, not the disk read, is the
        // slow part, and clearing the flag earlier hides the bar too soon.
        await nextPaint();
        recordPerf("note-open", openStartedAt);
      } catch (err: any) {
        const isRetryable = 
          err.name === "InvalidStateError" || 
          err.message?.includes("state had changed") ||
          err.name === "NotFoundError";

        if (isRetryable && retryCount < 2) {
          console.warn(`Open operation issues (stale/missing), retrying (${retryCount + 1})...`);
          
          let pathForRefresh = providedPath;
          if (!pathForRefresh) {
             for (const [metaPath, meta] of Object.entries(fileMetadata)) {
               if (meta.name === fileHandle.name) {
                 pathForRefresh = metaPath;
                 break;
               }
             }
          }

          if (pathForRefresh && vaultHandle) {
            try {
              const parts = pathForRefresh.split("/");
              let current: FileSystemDirectoryHandle = vaultHandle;
              for (let i = 0; i < parts.length - 1; i++) {
                current = await current.getDirectoryHandle(parts[i]);
              }
              const freshHandle = await current.getFileHandle(parts[parts.length - 1]);
              return await openFile(freshHandle, pathForRefresh, force, retryCount + 1, openStartedAt);
            } catch (retryErr) {
              console.warn("Failed to refresh handle for open retry:", retryErr);
            }
          }
          
          await new Promise((resolve) => setTimeout(resolve, 200));
          return await openFile(fileHandle, providedPath, force, retryCount + 1, openStartedAt);
        }

        console.error("File System Error:", err?.message || err);
        toast.error("Failed to open file");
      } finally {
        setIsFileLoading(false);
        clearOpening();
      }
    },
    [
      setActiveFileHandle,
      activeFilePath,
      setActiveFilePath,
      vaultHandle,
      fileMetadata,
      setFileConflict,
      lastSavedContent,
      setOpenFiles,
      setIsFileLoading,
      setOpeningFilePath,
      dialog,
      showOpenNoteAtOnce,
    ],
  );

  const openFileByName = useCallback(
    async (name: string) => {
      const match = resolveFileMetaByName(name, fileMetadata, activeFilePath);
      if (match) {
        await openFile(match.handle, match.path);
      } else {
        toast.error(`File not found: ${name.split("|")[0].trim()}`);
      }
    },
    [fileMetadata, openFile, activeFilePath],
  );

  return { openFile, openFileByName };
}
