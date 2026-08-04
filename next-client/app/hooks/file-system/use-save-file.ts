"use client";

import { useAtom } from "jotai";
import { useCallback } from "react";
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
} from "@/app/atoms/atoms";
import { atom_autosaveMode, atom_snapshotOnConflict } from "@/app/atoms/ui-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { extractTasks } from "@/app/utils/taskExtractor";

export function useSaveFile() {
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
  const [autosaveMode, setAutosaveMode] = useAtom(atom_autosaveMode);
  const [snapshotOnConflict] = useAtom(atom_snapshotOnConflict);
  const [, setFileMetadata] = useAtom(atom_fileMetadata);

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

      let toWrite = content;
      if (!toWrite) toWrite = "\n";

      let writable: FileSystemWritableFileStream | null = null;
      try {
        // On Android Chrome, write permission can expire between sessions. Check before
        // attempting createWritable() so we can give actionable feedback instead of a
        // silent failure (auto-save has no user gesture to re-trigger the permission dialog).
        if (typeof (fileToSave as any).queryPermission === "function") {
          const permState = await (fileToSave as any).queryPermission({ mode: "readwrite" });
          if (permState !== "granted") {
            if (isAutoSave) {
              const msg = "Write permission needed — save manually to restore access.";
              toast.error(msg, { id: "save-error" });
              setSaveStatus({ state: "error", retryCount: 0, message: msg, path: targetPath });
              setTimeout(() => setSaveStatus({ state: "idle", retryCount: 0, path: undefined }), 6000);
              return false;
            }
            // Manual save has a user gesture — attempt to re-request permission
            try {
              const newState = await (fileToSave as any).requestPermission({ mode: "readwrite" });
              if (newState !== "granted") {
                toast.error("Write permission denied. Re-open the vault to restore access.", { id: "save-error" });
                setSaveStatus({ state: "error", retryCount: 0, message: "Permission denied", path: targetPath });
                setTimeout(() => setSaveStatus({ state: "idle", retryCount: 0, path: undefined }), 5000);
                return false;
              }
            } catch {
              // Fall through; createWritable will surface the error
            }
          }
        }

        writable = await fileToSave.createWritable();
        if (writable) {
          await writable.write(toWrite);
          await writable.close();
          writable = null;
        }

        // Re-derive this file's tasks/tokens/score synchronously from the
        // content just written to disk, so the Tasks view and token cost
        // estimate reflect a save immediately — regardless of whether this
        // file is the active tab, a background tab, or not open at all (e.g.
        // Tasks view's own write-back). Without this, these fields only
        // refresh on the next full vault rescan (5-min interval, window
        // refocus, or manual refresh). This is the "save-triggered, not
        // live" computation point for the token cost estimate.
        if (targetPath) {
          setFileMetadata((prev) => {
            const entry = prev[targetPath!];
            if (!entry) return prev;
            return {
              ...prev,
              [targetPath!]: {
                ...entry,
                tasks: extractTasks(targetPath!, toWrite),
              },
            };
          });
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
                    lastSavedContent: toWrite,
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

        // Auto-enable cloud mode if we hit this error repeatedly (silently)
        if (isInvalidState && !isCloudVault && retryCount > 1) {
          setIsCloudVault(true);
        }

        const isRetryable =
          isInvalidState ||
          err.message?.includes("locked") ||
          err.name === "NoModificationAllowedError";

        if (isRetryable && retryCount < 10) {
          const delay = 400 * Math.pow(1.5, retryCount);
          
          // Wait FIRST to give the external sync client time to finish its operation
          await new Promise((resolve) => setTimeout(resolve, delay));

          let handleToRetry = handle;

          // Try to get a fresh handle if we have a vault
          if (targetPath && targetPath !== "draft" && vaultHandle) {
            try {
              const parts = targetPath.split("/");
              let current: FileSystemDirectoryHandle = vaultHandle;
              for (let i = 0; i < parts.length - 1; i++) {
                current = await current.getDirectoryHandle(parts[i]);
              }
              // Use create: true so if the sync client temporarily deleted it, we recreate it instantly!
              const freshHandle = await current.getFileHandle(parts[parts.length - 1], { create: true });
              handleToRetry = freshHandle;
              
              // Only update active handle if we successfully got a fresh one
              if (!handle || handle === activeFileHandle) {
                setActiveFileHandle(freshHandle);
              }
            } catch (retryErr: any) {
              // If NotFoundError, the sync client might have temporarily deleted it. We'll retry next loop.
              console.warn("Failed to refresh handle for retry:", retryErr);
            }
          } else if (isInvalidState) {
             // If we don't have a vaultHandle, we CANNOT recover from InvalidStateError!
             const msg = "File modified externally. Please re-open it to save.";
             setSaveStatus({ state: "error", retryCount: 0, message: msg, path: targetPath });
             toast.error(msg, { id: "save-error" });
             return false;
          }

          // Wait and retry
          const backoff = Math.min(200 * Math.pow(1.5, retryCount), 1500);
          await new Promise(resolve => setTimeout(resolve, backoff));
          
          const maxRetries = isAutoSave ? 8 : 2; // Fast fail for manual saves
          if (retryCount < maxRetries) {
            return saveFile(content, handleToRetry, retryCount + 1, isAutoSave, targetPath);
          }
        }

        console.warn("File System Error: Exceeded retries. Failing gracefully.", err?.message || err);
        let errorMsg = isInvalidState ? "File locked by cloud sync" : err.message;

        if (isInvalidState && vaultHandle && targetPath) {
          if (!isAutoSave) {
            const msg = "Cloud sync is syncing and locked the file. Please wait a moment and hit Save again.";
            toast.error(msg, { id: "save-error", duration: 6000 });
            setSaveStatus({ state: "error", retryCount: 0, message: msg, path: targetPath });
            return false;
          } else {
            errorMsg = "Cloud sync lock detected. Save deferred.";
            if (autosaveMode !== "manual") {
              setAutosaveMode("manual");
              toast("Cloud sync lock detected. Autosave has been automatically paused. You can re-enable it in Settings.", { icon: "⏸️", duration: 8000 });
            }
          }
        } else if (isCloudVault && isInvalidState) {
          errorMsg = "Cloud sync lock detected. Retries failed. Try pausing sync.";
        }
        
        // Record a local snapshot for recovery/merge UI so users don't lose edits.
        try {
          if (snapshotOnConflict && targetPath) {
            const ts = Date.now();
            const localSnapshot = { timestamp: ts, type: "local", content } as any;
            let remoteSnapshot = null as null | { timestamp: number; type: string; content: string };
            try {
              const f = await fileToSave.getFile();
              const remoteText = await f.text();
              remoteSnapshot = { timestamp: ts, type: "remote", content: remoteText } as any;
            } catch (readErr) {
              // ignore - may be locked
            }
            setOpenFiles(prev => {
              const fileState = prev[targetPath!];
              if (!fileState) return prev;
              const existing = fileState.snapshots ?? [];
              const next = [...existing, localSnapshot];
              if (remoteSnapshot) next.push(remoteSnapshot);
              return { ...prev, [targetPath!]: { ...fileState, snapshots: next } };
            });
          }
        } catch (snapshotErr) {
          console.warn("Failed to record snapshot:", snapshotErr);
        }

        setSaveStatus({ state: "error", retryCount, message: errorMsg, path: targetPath });
        setTimeout(() => setSaveStatus({ state: "idle", retryCount: 0, path: undefined }), 5000);

        if (err.name === "NotAllowedError") {
          const msg = isAutoSave
            ? "Auto-save needs permission — save manually to restore access."
            : "Write permission expired. Re-open the vault to restore access.";
          setSaveStatus({ state: "error", retryCount: 0, message: msg, path: targetPath });
          setTimeout(() => setSaveStatus({ state: "idle", retryCount: 0, path: undefined }), 6000);
          toast.error(msg, { id: "save-error" });
        } else if (err.name !== "AbortError") {
          toast.error(`Failed to save: ${errorMsg}`, { id: "save-error" });
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
      setFileMetadata,
      isCloudVault,
      setIsCloudVault,
      autosaveMode,
      setAutosaveMode,
    ],
  );

  return { saveFile };
}
