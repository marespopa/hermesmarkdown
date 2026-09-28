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
  atom_fileLastModified,
  atom_fileConflict,
  atom_openFiles,
  contentStore,
} from "@/app/atoms/atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_homeFeedOpen, atom_isFileLoading } from "@/app/atoms/ui-atoms";
import { nextPaint } from "@/app/utils/next-paint";
import { useDialog } from "../use-dialog";
import { resolveFileMetaByName } from "./resolve-file-by-name";

export function useOpenFile() {
  const [vaultHandle] = useAtom(atom_vaultHandle);
  const [, setActiveFileHandle] = useAtom(atom_activeFileHandle);
  const [activeFilePath, setActiveFilePath] = useAtom(atom_activeFilePath);
  const [content] = useAtom(atom_content);
  const [fileMetadata] = useAtom(atom_fileMetadata);
  const [, setOpenFiles] = useAtom(atom_openFiles);
  const [lastSavedContent] = useAtom(atom_lastSavedContent);
  const [, setFileLastModified] = useAtom(atom_fileLastModified);
  const [, setFileConflict] = useAtom(atom_fileConflict);
  const [, setIsFileLoading] = useAtom(atom_isFileLoading);
  const setHomeFeedOpen = useSetAtom(atom_homeFeedOpen);
  const dialog = useDialog();

  const openFile = useCallback(
    async (
      fileHandle: FileSystemFileHandle,
      providedPath?: string,
      force: boolean = false,
      retryCount = 0,
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

      // 0. Saved content on disk always wins when (re)opening a file. If the
      // browser holds different, unsaved text for it, that text is kept as a
      // "local" snapshot on the tab (recoverable) instead of prompting.
      const existing = contentStore.get(atom_openFiles)[finalPath];
      const browserOnlyEdit =
        existing && existing.content !== existing.lastSavedContent && existing.content.trim()
          ? existing.content
          : null;

      // The CURRENT active file being dirty is only a concern when it's the
      // draft, which has no file on disk to fall back to.
      if (!force && !browserOnlyEdit && (!activeFilePath || activeFilePath === "draft") && content !== lastSavedContent) {
        const confirmed = await dialog.confirm(
          "You have unsaved changes in your draft. Open this file and discard them?",
          "Unsaved Changes",
          "Open File",
          "Cancel",
          "You can save your draft first to avoid losing work.",
        );
        if (!confirmed) return;
      }

      try {
        setIsFileLoading(true);
        const file = await fileHandle.getFile();
        const fileContent = await file.text();

        // 1. Update openFiles registry first so the pane has data to read (persisted fields only)
        setOpenFiles((prev) => {
          const previous = prev[finalPath];
          const keepLocal = browserOnlyEdit !== null && browserOnlyEdit !== fileContent;
          const snapshots = keepLocal
            ? [...(previous?.snapshots ?? []), { timestamp: Date.now(), type: "local" as const, content: browserOnlyEdit }]
            : previous?.snapshots;
          return {
            ...prev,
            [finalPath]: {
              content: fileContent,
              lastSavedContent: fileContent,
              fileName: fileHandle.name,
              activeFilePath: finalPath,
              ...(snapshots ? { snapshots } : {}),
            },
          };
        });

        // 2. Switch active path (leaving the home feed, if it's showing)
        setActiveFilePath(finalPath);
        setHomeFeedOpen(false);

        // 3. Store the "live" handle separately (non-persisted)
        setActiveFileHandle(fileHandle);

        // 4. Update non-file-specific state
        setFileLastModified(file.lastModified);
        setFileConflict(null);

        // 5. Keep the loading indicator up until the editor has rendered the
        // new file — for large notes that render, not the disk read, is the
        // slow part, and clearing the flag earlier hides the bar too soon.
        await nextPaint();
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
              return openFile(freshHandle, pathForRefresh, force, retryCount + 1);
            } catch (retryErr) {
              console.warn("Failed to refresh handle for open retry:", retryErr);
            }
          }
          
          await new Promise((resolve) => setTimeout(resolve, 200));
          return openFile(fileHandle, providedPath, force, retryCount + 1);
        }

        console.error("File System Error:", err?.message || err);
        toast.error("Failed to open file");
      } finally {
        setIsFileLoading(false);
      }
    },
    [
      setActiveFileHandle,
      activeFilePath,
      setActiveFilePath,
      vaultHandle,
      fileMetadata,
      setFileLastModified,
      setFileConflict,
      content,
      lastSavedContent,
      setOpenFiles,
      setIsFileLoading,
      setHomeFeedOpen,
      dialog,
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
