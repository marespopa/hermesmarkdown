"use client";

import { useAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
  atom_vaultHandle,
  atom_activeFileHandle,
  atom_activeFilePath,
  atom_fileName,
  atom_lastSavedContent,
  atom_fileLastModified,
  atom_fileConflict,
  atom_openFiles,
  atom_saveStatus,
  atom_isCloudVault,
  atom_autoInjectFrontmatter,
} from "@/app/atoms/atoms";
import { injectFrontmatter } from "@/app/utils/frontmatterInjector";

interface UseSaveFileProps {
  indexVaultTags: (passedHandle?: FileSystemDirectoryHandle) => Promise<void>;
}

export function useSaveFile({ indexVaultTags }: UseSaveFileProps) {
  const [vaultHandle] = useAtom(atom_vaultHandle);
  const [activeFileHandle, setActiveFileHandle] = useAtom(atom_activeFileHandle);
  const [activeFilePath, setActiveFilePath] = useAtom(atom_activeFilePath);
  const [, setFileName] = useAtom(atom_fileName);
  const [, setOpenFiles] = useAtom(atom_openFiles);
  const [, setLastSavedContent] = useAtom(atom_lastSavedContent);
  const [, setFileLastModified] = useAtom(atom_fileLastModified);
  const [, setFileConflict] = useAtom(atom_fileConflict);
  const [, setSaveStatus] = useAtom(atom_saveStatus);
  const [isCloudVault, setIsCloudVault] = useAtom(atom_isCloudVault);
  const [autoInjectFrontmatter] = useAtom(atom_autoInjectFrontmatter);

  // Debounce re-indexing on auto-saves so rapid saves during typing don't
  // repeatedly flash the "Scanning subfolders…" indicator in the sidebar.
  const indexVaultTagsTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (indexVaultTagsTimerRef.current) clearTimeout(indexVaultTagsTimerRef.current);
    };
  }, []);

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

      const toWrite = autoInjectFrontmatter
        ? injectFrontmatter(content, fileToSave.name)
        : content;

      // On Android Chrome, write permission can expire between sessions. Check before
      // attempting createWritable() so we can give actionable feedback instead of a
      // silent failure (auto-save has no user gesture to re-trigger the permission dialog).
      if (typeof (fileToSave as any).queryPermission === "function") {
        const permState = await (fileToSave as any).queryPermission({ mode: "readwrite" });
        if (permState !== "granted") {
          if (isAutoSave) {
            setSaveStatus({ state: "error", retryCount: 0, message: "Tap to save — write permission needed", path: targetPath });
            setTimeout(() => setSaveStatus({ state: "idle", retryCount: 0, path: undefined }), 6000);
            return false;
          }
          // Manual save has a user gesture — attempt to re-request permission
          try {
            const newState = await (fileToSave as any).requestPermission({ mode: "readwrite" });
            if (newState !== "granted") {
              toast.error("Write permission denied. Re-open the vault to restore access.");
              setSaveStatus({ state: "error", retryCount: 0, message: "Permission denied", path: targetPath });
              setTimeout(() => setSaveStatus({ state: "idle", retryCount: 0, path: undefined }), 5000);
              return false;
            }
          } catch {
            // Fall through; createWritable will surface the error
          }
        }
      }

      let writable: FileSystemWritableFileStream | null = null;
      try {
        writable = await fileToSave.createWritable();
        if (writable) {
          await writable.write(toWrite);
          await writable.close();
          writable = null;
        }

        // Secondary task: Update metadata.
        const updateMetadata = async (retries = 3) => {
          const wasActive = !providedPath || providedPath === (activeFilePath || "draft");
          try {
            const updatedFile = await fileToSave.getFile();
            if (wasActive) {
              setLastSavedContent(toWrite);
              setFileLastModified(updatedFile.lastModified);
              setFileConflict(null);
            }
            
            if (targetPath) {
              setOpenFiles((prev) => {
                if (!prev[targetPath!]) return prev;
                return { 
                  ...prev, 
                  [targetPath!]: { 
                    ...prev[targetPath!], 
                    content: toWrite,
                    lastSavedContent: toWrite 
                  } 
                };
              });
            }
            return true;
          } catch {
            if (retries > 0) {
              await new Promise(r => setTimeout(r, 100 * (4 - retries)));
              return updateMetadata(retries - 1);
            }
            if (wasActive) {
              setLastSavedContent(toWrite);
            }
            if (targetPath) {
              setOpenFiles((prev) => {
                if (!prev[targetPath!]) return prev;
                return { ...prev, [targetPath!]: { ...prev[targetPath!], lastSavedContent: toWrite } };
              });
            }
            return false;
          }
        };

        updateMetadata();

        // Handle update
        if (handle) {
          const wasActive = !providedPath || providedPath === (activeFilePath || "draft");

          if (wasActive) {
            setActiveFileHandle(handle);
            setFileName(handle.name.replace(".md", ""));
          }

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
            const oldPath = providedPath || activeFilePath || "draft";

            if (oldPath !== finalPath) {
              next[finalPath] = {
                content: toWrite,
                lastSavedContent: toWrite,
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

          if (wasActive) {
            setActiveFilePath(finalPath);
          }
        }

        // Background indexing — debounce for auto-saves to avoid flashing the
        // "Scanning subfolders…" indicator on every keystroke-triggered save.
        if (isAutoSave) {
          if (indexVaultTagsTimerRef.current) clearTimeout(indexVaultTagsTimerRef.current);
          indexVaultTagsTimerRef.current = setTimeout(() => indexVaultTags(), 3000);
        } else {
          indexVaultTags();
        }
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

        if (err.name === "NotAllowedError") {
          const msg = isAutoSave
            ? "Auto-save needs permission — tap anywhere then save manually."
            : "Write permission expired. Re-open the vault to restore access.";
          setSaveStatus({ state: "error", retryCount: 0, message: msg, path: targetPath });
          setTimeout(() => setSaveStatus({ state: "idle", retryCount: 0, path: undefined }), 6000);
          if (!isAutoSave) toast.error(msg);
        } else if (err.name !== "AbortError") {
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
      autoInjectFrontmatter,
    ],
  );

  return { saveFile };
}
