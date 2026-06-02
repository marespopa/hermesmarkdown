"use client";

import { useAtom } from "jotai";
import { useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import {
  atom_vaultHandle,
  atom_activeFileHandle,
  atom_activeFilePath,
  atom_content,
  atom_fileName,
  atom_lastSavedContent,
  atom_fileLastModified,
  atom_fileConflict,
  atom_openFiles,
  atom_saveStatus,
  atom_isCloudVault,
  contentStore,
} from "@/app/atoms/atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { useDialog } from "../use-dialog";
import { metadataWorker, withPickerLock } from "./shared";

interface UseFileEditorProps {
  indexVaultTags: (passedHandle?: FileSystemDirectoryHandle) => Promise<void>;
}

export function useFileEditor({ indexVaultTags }: UseFileEditorProps) {
  const [vaultHandle] = useAtom(atom_vaultHandle);
  const [activeFileHandle, setActiveFileHandle] = useAtom(atom_activeFileHandle);
  const [activeFilePath, setActiveFilePath] = useAtom(atom_activeFilePath);
  const [content] = useAtom(atom_content);
  const [, setFileName] = useAtom(atom_fileName);
  const [fileMetadata] = useAtom(atom_fileMetadata);
  const [, setOpenFiles] = useAtom(atom_openFiles);
  const [lastSavedContent, setLastSavedContent] = useAtom(atom_lastSavedContent);
  const [, setFileLastModified] = useAtom(atom_fileLastModified);
  const [, setFileConflict] = useAtom(atom_fileConflict);
  const [, setSaveStatus] = useAtom(atom_saveStatus);
  const [isCloudVault, setIsCloudVault] = useAtom(atom_isCloudVault);
  const dialog = useDialog();

  const openFile = useCallback(
    async (
      fileHandle: FileSystemFileHandle,
      providedPath?: string,
      force: boolean = false,
      retryCount = 0,
    ) => {
      let path = providedPath;
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

        // 2. Switch active path (this now correctly updates workspaceLayout via atoms.ts)
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
          
          // If we have a path and a vault, try to get a fresh handle
          let pathForRefresh = providedPath;
          if (!pathForRefresh) {
             // Try to find path in metadata even if getFile failed
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
      dialog,
    ],
  );

  const saveFile = useCallback(
    async (
      content: string,
      handle?: FileSystemFileHandle,
      retryCount = 0,
      isAutoSave = false,
      providedPath?: string,
    ): Promise<boolean> => {
      const fileToSave = handle || activeFileHandle;
      if (!fileToSave) return false;

      // Resolve the path early to provide feedback on the correct tab
      let targetPath = providedPath;
      if (!targetPath) {
        if (!handle || handle === activeFileHandle) {
          targetPath = activeFilePath || undefined;
        } else if (vaultHandle) {
          try {
            const parts = await (vaultHandle as any).resolve(handle);
            if (parts) targetPath = parts.join("/");
          } catch {
            targetPath = handle.name;
          }
        } else {
          targetPath = handle.name;
        }
      }

      setSaveStatus({
        state: "saving",
        retryCount,
        message: retryCount > 0 ? `Retry ${retryCount}/8` : undefined,
        path: targetPath,
      });

      let writable: FileSystemWritableFileStream | null = null;
      try {
        writable = await fileToSave.createWritable();
        if (writable) {
          await writable.write(content);
          await writable.close();
          writable = null;
        }

        // Secondary task: Update metadata.
        // We retry this specifically because cloud sync often locks the file 
        // for a few milliseconds immediately after a close() call.
        const updateMetadata = async (retries = 3) => {
          try {
            const updatedFile = await fileToSave.getFile();
            setLastSavedContent(content);
            setFileLastModified(updatedFile.lastModified);
            setFileConflict(null);
            return true;
          } catch {
            if (retries > 0) {
              await new Promise(r => setTimeout(r, 100 * (4 - retries)));
              return updateMetadata(retries - 1);
            }
            setLastSavedContent(content);
            return false;
          }
        };
        
        updateMetadata();

        // Handle update
        if (handle) {
          setActiveFileHandle(handle);
          setFileName(handle.name.replace(".md", ""));

          let finalPath = handle.name;
          if (vaultHandle) {
            try {
              const pathParts = await (vaultHandle as any).resolve(handle);
              if (pathParts) {
                finalPath = pathParts.join("/");
              }
            } catch {
              // fallback
            }
          }

          setOpenFiles((prev) => {
            const next = { ...prev };
            const oldPath = activeFilePath || "draft";

            if (oldPath !== finalPath) {
              next[finalPath] = {
                content,
                lastSavedContent: content,
                fileName: handle.name,
                activeFilePath: finalPath,
              };

              if (oldPath === "draft") {
                next.draft = {
                  content: "",
                  lastSavedContent: "",
                  fileName: "untitled",
                  activeFilePath: null,
                };
              }
            }
            return next;
          });

          setActiveFilePath(finalPath);
        }

        // Background indexing
        indexVaultTags();
        setSaveStatus({ state: "saved", retryCount, path: targetPath });
        setTimeout(() => setSaveStatus({ state: "idle", retryCount: 0, path: undefined }), 2000);

        if (!isAutoSave) {
          toast.success("Saved to " + fileToSave.name);
        }

        return true;
      } catch (err: any) {
        const isInvalidState =
          err.name === "InvalidStateError" ||
          err.message?.includes("state had changed");

        // Auto-enable cloud mode if we hit this error repeatedly
        if (isInvalidState && !isCloudVault && retryCount > 1) {
          setIsCloudVault(true);
          toast.success("Sync conflict detected. Switching to cloud recovery mode.", {
            icon: "☁️",
            id: "cloud-detect-toast",
          });
        }

        const isRetryable =
          isInvalidState ||
          err.message?.includes("locked") ||
          err.name === "NoModificationAllowedError";

        if (isRetryable && retryCount < (isCloudVault ? 15 : 8)) {
          const baseDelay = isCloudVault ? 800 : 400;
          const delay = baseDelay * Math.pow(isCloudVault ? 1.7 : 1.5, retryCount);

          // Try to refresh the handle if it's in the vault
          if (targetPath && targetPath !== "draft" && vaultHandle) {
            try {
              const parts = targetPath.split("/");
              let current: FileSystemDirectoryHandle = vaultHandle;

              // Walk the path to get a fresh handle
              for (let i = 0; i < parts.length - 1; i++) {
                current = await current.getDirectoryHandle(parts[i]);
              }
              const freshHandle = await current.getFileHandle(parts[parts.length - 1]);

              // Update active handle if we just refreshed it
              if (!handle || handle === activeFileHandle) {
                setActiveFileHandle(freshHandle);
              }

              await new Promise((resolve) => setTimeout(resolve, delay));
              return saveFile(content, freshHandle, retryCount + 1, isAutoSave, targetPath);
            } catch (retryErr) {
              console.warn("Failed to refresh handle for retry:", retryErr);
            }
          }

          await new Promise((resolve) => setTimeout(resolve, delay));
          return saveFile(content, handle, retryCount + 1, isAutoSave, targetPath);
        }

        console.error("File System Error:", err?.message || err);
        let errorMsg = isInvalidState ? "File locked by cloud sync" : err.message;

        if (isCloudVault && isInvalidState) {
          errorMsg = "Cloud sync lock detected. Retries failed. Try pausing sync.";
        }
        
        setSaveStatus({ state: "error", retryCount, message: errorMsg, path: targetPath });
        setTimeout(() => setSaveStatus({ state: "idle", retryCount: 0, path: undefined }), 5000);

        if (err.name !== "NotAllowedError" && err.name !== "AbortError") {
          toast.error(`Failed to save: ${errorMsg}`);
        }
        return false;
      } finally {
        if (writable) {
          try {
            await (writable as any).close();
          } catch {
            // Ignore cleanup error
          }
        }
      }
    },
    [
      activeFileHandle,
      indexVaultTags,
      setLastSavedContent,
      setFileLastModified,
      setFileConflict,
      setActiveFileHandle,
      setFileName,
      vaultHandle,
      setActiveFilePath,
      activeFilePath,
      setSaveStatus,
      setOpenFiles,
      isCloudVault,
      setIsCloudVault,
    ],
  );

  const exportFile = useCallback(
    async (content: string, fileName: string) => {
      if (!content.trim()) return false;

      const baseName =
        fileName.trim() ||
        content
          .split("\n")[0]
          .replace(/[^\w\s]/gi, "")
          .slice(0, 20)
          .trim() ||
        "untitled";

      const finalName = baseName.endsWith(".md") ? baseName : `${baseName}.md`;

      // 1. Try Desktop File System Access API
      if ("showSaveFilePicker" in window) {
        try {
          const handle = await withPickerLock(async () => {
            try {
              return await (window as any).showSaveFilePicker({
                suggestedName: finalName,
                types: [
                  { description: "Markdown", accept: { "text/markdown": [".md"] } },
                ],
                startIn: vaultHandle || undefined,
              });
            } catch (err: any) {
              if (err.name === "AbortError" || err.name === "NotAllowedError") return undefined;
              throw err;
            }
          });

          if (handle) {
            const success = await saveFile(content, handle);
            if (success) return true;
          } else if (handle === null) {
             // Lock active but ignored, or cancelled
             return false;
          }
        } catch (err: any) {
          console.error("Picker failed, trying fallback:", err);
        }
      }

      // 2. Try Web Share API (Better for Android/iOS)
      if (navigator.share && navigator.canShare) {
        const file = new File([content], finalName, { type: "text/markdown" });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: finalName,
            });
            // Treat share as successful save contextually
            setLastSavedContent(content);
            setFileConflict(null);
            toast.success("Shared successfully");
            return true;
          } catch (err: any) {
            if (err instanceof Error && err.name === "AbortError") return false;
            console.error("Share failed:", err);
          }
        }
      }

      // 3. Fallback: Blob Download
      const blob = new Blob([content], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = finalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // Treat download as successful save contextually
      setLastSavedContent(content);
      setFileConflict(null);
      toast.success("Download started");
      return true;
    },
    [vaultHandle, saveFile, setLastSavedContent, setFileConflict],
  );

  const openFileByName = useCallback(
    async (name: string) => {
      // Handle aliases: [[Path/To/File|Alias]] -> "Path/To/File"
      const cleanName = name.split("|")[0].trim();
      const fileName = cleanName.endsWith(".md")
        ? cleanName
        : `${cleanName}.md`;

      // 1. Try exact path match (from vault root)
      const exactMatch = Object.values(fileMetadata).find(
        (meta) => meta.path.toLowerCase() === fileName.toLowerCase(),
      );

      if (exactMatch) {
        await openFile(exactMatch.handle, exactMatch.path);
        return;
      }

      // 2. Try filename-only match anywhere in vault
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

  // Debounced Active File Re-indexing
  useEffect(() => {
    if (!activeFileHandle || !metadataWorker || !vaultHandle || !activeFilePath) return;

    const timeoutId = setTimeout(async () => {
      try {
        metadataWorker?.postMessage({
          files: [{ handle: activeFileHandle, path: activeFilePath }],
        });
      } catch (err: any) {
        console.error("Failed to index active file:", err);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [content, activeFileHandle, vaultHandle, activeFilePath]);

  return {
    activeFileHandle,
    openFile,
    saveFile,
    exportFile,
    openFileByName,
  };
}
