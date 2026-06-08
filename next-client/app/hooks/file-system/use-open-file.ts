"use client";

import { useAtom } from "jotai";
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
import { atom_isFileLoading } from "@/app/atoms/ui-atoms";
import { useDialog } from "../use-dialog";

export function useOpenFile() {
  const [vaultHandle] = useAtom(atom_vaultHandle);
  const [, setActiveFileHandle] = useAtom(atom_activeFileHandle);
  const [, setActiveFilePath] = useAtom(atom_activeFilePath);
  const [content] = useAtom(atom_content);
  const [fileMetadata] = useAtom(atom_fileMetadata);
  const [, setOpenFiles] = useAtom(atom_openFiles);
  const [lastSavedContent] = useAtom(atom_lastSavedContent);
  const [, setFileLastModified] = useAtom(atom_fileLastModified);
  const [, setFileConflict] = useAtom(atom_fileConflict);
  const [, setIsFileLoading] = useAtom(atom_isFileLoading);
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

      // 0. Check for unsaved changes (Dirty State protection)
      if (!force) {
        const openFiles = contentStore.get(atom_openFiles);
        const existing = openFiles[finalPath];
        
        // Scenario A: The file we are opening is already dirty in browser memory
        if (existing && existing.content !== existing.lastSavedContent) {
           const confirmed = await dialog.confirm(
            `"${fileHandle.name}" has unsaved changes in your browser. Opening it will overwrite those changes with the version from your computer.`,
            "Overwrite unsaved changes?",
            "Overwrite",
            "Cancel"
          );
          if (!confirmed) return;
        } 
        
        // Scenario B: The CURRENT active file is dirty (standard focus-loss warning)
        else if (content !== lastSavedContent) {
          const confirmed = await dialog.confirm(
            "You have unsaved changes in your current file/draft. Open this file and discard changes?",
            "Unsaved Changes",
            "Open File",
            "Cancel",
            "You can save your current changes first to avoid losing work."
          );
          if (!confirmed) return;
        }
      }

      try {
        setIsFileLoading(true);
        const file = await fileHandle.getFile();
        const fileContent = await file.text();

        // 1. Update openFiles registry first so the pane has data to read (persisted fields only)
        setOpenFiles((prev) => ({
          ...prev,
          [finalPath]: {
            content: fileContent,
            lastSavedContent: fileContent,
            fileName: fileHandle.name,
            activeFilePath: finalPath,
          },
        }));

        // 2. Switch active path
        setActiveFilePath(finalPath);

        // 3. Store the "live" handle separately (non-persisted)
        setActiveFileHandle(fileHandle);

        // 4. Update non-file-specific state
        setFileLastModified(file.lastModified);
        setFileConflict(null);
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
      setActiveFilePath,
      vaultHandle,
      fileMetadata,
      setFileLastModified,
      setFileConflict,
      content,
      lastSavedContent,
      setOpenFiles,
      setIsFileLoading,
      dialog,
    ],
  );

  const openFileByName = useCallback(
    async (name: string) => {
      const cleanName = name.split("|")[0].trim();
      const fileName = cleanName.endsWith(".md")
        ? cleanName
        : `${cleanName}.md`;

      const exactMatch = Object.values(fileMetadata).find(
        (meta) => meta.path.toLowerCase() === fileName.toLowerCase(),
      );

      if (exactMatch) {
        await openFile(exactMatch.handle, exactMatch.path);
        return;
      }

      const nameOnly = cleanName.split("/").pop() || "";
      const nameOnlyWithExt = nameOnly.endsWith(".md")
        ? nameOnly.toLowerCase()
        : `${nameOnly.toLowerCase()}.md`;

      const fuzzyMatch = Object.values(fileMetadata).find(
        (meta) => meta.name.toLowerCase() === nameOnlyWithExt,
      );

      if (fuzzyMatch) {
        await openFile(fuzzyMatch.handle, fuzzyMatch.path);
      } else {
        toast.error(`File not found: ${cleanName}`);
      }
    },
    [fileMetadata, openFile],
  );

  return { openFile, openFileByName };
}
