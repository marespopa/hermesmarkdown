"use client";

import { useAtom } from "jotai";
import {
  atom_vaultHandle,
  atom_currentDirectoryHandle,
  atom_activeFileHandle,
  atom_activeFilePath,
  atom_vaultFiles,
  atom_isVaultPending,
  atom_hasLoadedVault,
  atom_content,
  atom_fileName,
  atom_lastSavedContent,
  atom_fileLastModified,
  atom_fileConflict,
  atom_pendingFileSwitch,
  atom_openFiles,
  atom_saveStatus,
  atom_workspaceLayout,
} from "@/app/atoms/atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useDialog } from "./use-dialog";
import {
  saveVaultHandle,
  loadVaultHandle,
  clearVaultHandle,
  verifyPermission,
} from "@/app/services/idb";

let metadataWorker: Worker | null = null;
if (typeof window !== "undefined") {
  metadataWorker = new Worker(new URL("../workers/metadata.worker.ts", import.meta.url));
}

const isVaultSupported = typeof window !== "undefined" && "showDirectoryPicker" in window;
const isIdbSupported = typeof window !== "undefined" && !!window.indexedDB;

// Global lock to prevent "File picker already active" errors
let isPickerActive = false;

async function withPickerLock<T>(fn: () => Promise<T>): Promise<T | undefined> {
  if (isPickerActive) {
    console.warn("Picker already active, ignoring request");
    return undefined;
  }
  isPickerActive = true;
  try {
    return await fn();
  } finally {
    // Small delay to ensure the browser has fully cleared the previous picker state
    setTimeout(() => {
      isPickerActive = false;
    }, 500);
  }
}

export function useFileSystem() {
  const [vaultHandle, setVaultHandle] = useAtom(atom_vaultHandle);
  const [currentDirectoryHandle, setCurrentDirectoryHandle] = useAtom(atom_currentDirectoryHandle);
  const [activeFileHandle, setActiveFileHandle] = useAtom(atom_activeFileHandle);
  const [activeFilePath, setActiveFilePath] = useAtom(atom_activeFilePath);
  const [vaultFiles, setVaultFiles] = useAtom(atom_vaultFiles);
  const [isVaultPending, setIsVaultPending] = useAtom(atom_isVaultPending);
  const [hasLoadedVault, setHasLoadedVault] = useAtom(atom_hasLoadedVault);
  const [content, setContent] = useAtom(atom_content);
  const [, setFileName] = useAtom(atom_fileName);
  const [fileMetadata, setFileMetadata] = useAtom(atom_fileMetadata);
  const [, setOpenFiles] = useAtom(atom_openFiles);
  const [lastSavedContent, setLastSavedContent] = useAtom(atom_lastSavedContent);
  const [, setFileLastModified] = useAtom(atom_fileLastModified);
  const [, setFileConflict] = useAtom(atom_fileConflict);
  const [, setPendingFileSwitch] = useAtom(atom_pendingFileSwitch);
  const [, setSaveStatus] = useAtom(atom_saveStatus);
  const [, setWorkspaceLayout] = useAtom(atom_workspaceLayout);
  const dialog = useDialog();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const isVaultSupportedMounted = isVaultSupported && mounted;
  const isIdbSupportedMounted = isIdbSupported && mounted;

  // Worker Message Listener
  useEffect(() => {
    if (!metadataWorker) return;

    const handleMessage = (event: MessageEvent) => {
      const { results } = event.data;
      if (!results) return;

      setFileMetadata((prev) => {
        const next = { ...prev };
        results.forEach((res: any) => {
          next[res.path] = res;
        });
        return next;
      });
    };

    metadataWorker.addEventListener("message", handleMessage);
    return () => metadataWorker?.removeEventListener("message", handleMessage);
  }, [setFileMetadata]);

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

  const scanVault = useCallback(
    async (handle: FileSystemDirectoryHandle) => {
      try {
        const entries: FileSystemHandle[] = [];
        for await (const entry of (handle as any).values()) {
          if (entry.kind === "file" && entry.name.endsWith(".md")) {
            entries.push(entry);
          } else if (entry.kind === "directory") {
            entries.push(entry);
          }
        }
        setVaultFiles(entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
      } catch (err: any) {
        console.warn("Failed to scan vault:", err);
      }
    },
    [setVaultFiles],
  );

  const indexVaultTags = useCallback(
    async (passedHandle?: FileSystemDirectoryHandle) => {
      try {
        const handle = passedHandle || vaultHandle;
        if (!handle || !metadataWorker) return;

        const fileHandles: { handle: FileSystemFileHandle; path: string }[] = [];

        async function collectFiles(
          dirHandle: FileSystemDirectoryHandle,
          path: string = "",
        ) {
          try {
            for await (const entry of (dirHandle as any).values()) {
              const currentPath = path ? `${path}/${entry.name}` : entry.name;
              if (entry.kind === "file" && entry.name.endsWith(".md")) {
                fileHandles.push({
                  handle: entry as FileSystemFileHandle,
                  path: currentPath,
                });
              } else if (entry.kind === "directory") {
                await collectFiles(entry, currentPath);
              }
            }
          } catch (err: any) {
            console.warn(`Failed to collect files from ${path || "root"}:`, err);
          }
        }

        await collectFiles(handle);
        metadataWorker.postMessage({ files: fileHandles });
      } catch (err: any) {
        console.error("Failed to index vault tags:", err);
      }
    },
    [vaultHandle],
  );

  const openVault = useCallback(async () => {
    if (!isVaultSupported) {
      toast.error("Your browser does not support local folder access. Try Chrome or Edge.");
      return;
    }

    const handle = await withPickerLock(async () => {
      try {
        return await window.showDirectoryPicker();
      } catch (err: any) {
        if (err.name !== "AbortError") throw err;
        return undefined;
      }
    });

    if (!handle) return;

    try {
      setVaultHandle(handle);
      setCurrentDirectoryHandle(handle);
      setIsVaultPending(false);
      await saveVaultHandle(handle);
      await scanVault(handle);
      await indexVaultTags(handle);
      toast.success("Vault opened: " + handle.name);
    } catch (err: any) {
      console.error("File System Error:", err?.message || err);
      toast.error("Failed to open vault");
    }
  }, [setVaultHandle, setCurrentDirectoryHandle, setIsVaultPending, scanVault, indexVaultTags]);

  // Load vault on mount
  useEffect(() => {
    if (hasLoadedVault || !isIdbSupported) return;
    
    async function init() {
      setHasLoadedVault(true);
      const savedHandle = await loadVaultHandle();
      if (savedHandle) {
        setVaultHandle(savedHandle);
        setIsVaultPending(true);
      }
    }
    init();
  }, [setVaultHandle, setIsVaultPending, hasLoadedVault, setHasLoadedVault]);

  const restoreVault = useCallback(async () => {
    if (!vaultHandle) return;

    const confirmed = await dialog.confirm(
      `HermesMarkdown needs permission to "allow this site to make edits" to your folder: ${vaultHandle.name}. This is required to save your notes.`,
      "re-authorize folder access",
      "Allow Edits",
      "Cancel",
      "Your notes stay 100% local on your device and are never saved on our servers.",
    );

    if (!confirmed) return;

    try {
      const granted = await verifyPermission(vaultHandle);
      if (granted) {
        setIsVaultPending(false);
        setCurrentDirectoryHandle(vaultHandle);
        await scanVault(vaultHandle);
        await indexVaultTags(vaultHandle);
        toast.success("Vault restored");
      }
    } catch (err: any) {
      console.error("File System Error:", err?.message || err);
      toast.error("Failed to restore vault");
    }
  }, [vaultHandle, setIsVaultPending, setCurrentDirectoryHandle, scanVault, indexVaultTags, dialog]);

  const openFile = useCallback(
    async (
      fileHandle: FileSystemFileHandle,
      providedPath?: string,
      force: boolean = false,
      retryCount = 0,
    ) => {
      // Check for unsaved changes
      const isDirty = content !== lastSavedContent;
      if (isDirty && !force) {
        setPendingFileSwitch({ handle: fileHandle, path: providedPath });
        return;
      }

      try {
        const file = await fileHandle.getFile();
        const fileContent = await file.text();

        let path = providedPath;
        if (!path && vaultHandle) {
          // If no path is provided, we must do the expensive reverse-lookup.
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

        // 1. Update openFiles registry first so the pane has data to read (persisted fields only)
        setOpenFiles((prev) => ({
          ...prev,
          [finalPath]: {
            content: fileContent,
            lastSavedContent: fileContent,
            fileName: fileHandle.name.replace(".md", ""),
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
      setPendingFileSwitch,
      setOpenFiles,
    ],
  );

  const saveFile = useCallback(
    async (content: string, handle?: FileSystemFileHandle, retryCount = 0, isAutoSave = false): Promise<boolean> => {
      const fileToSave = handle || activeFileHandle;
      if (!fileToSave) return false;

      setSaveStatus({ 
        state: "saving", 
        retryCount, 
        message: retryCount > 0 ? `Retry ${retryCount}/8` : undefined 
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
        try {
          const updatedFile = await fileToSave.getFile();
          setLastSavedContent(content);
          setFileLastModified(updatedFile.lastModified);
          setFileConflict(null);
        } catch {
          setLastSavedContent(content);
        }

        // Handle update
        if (handle) {
          setActiveFileHandle(handle);
          setFileName(handle.name.replace(".md", ""));
          
          if (vaultHandle) {
            try {
              const pathParts = await (vaultHandle as any).resolve(handle);
              if (pathParts) {
                setActiveFilePath(pathParts.join("/"));
              } else {
                setActiveFilePath(handle.name);
              }
            } catch {
              setActiveFilePath(handle.name);
            }
          } else {
            setActiveFilePath(handle.name);
          }
        }

        // Background indexing
        indexVaultTags();
        setSaveStatus({ state: "saved", retryCount });
        setTimeout(() => setSaveStatus({ state: "idle", retryCount: 0 }), 2000);
        
        if (!isAutoSave) {
          toast.success("Saved to " + fileToSave.name);
        }
        
        return true;
      } catch (err: any) {
        const isRetryable = 
          err.name === "InvalidStateError" || 
          err.message?.includes("state had changed") ||
          err.message?.includes("locked") ||
          err.name === "NoModificationAllowedError";

        if (isRetryable && retryCount < 8) {
          const delay = 400 * Math.pow(1.5, retryCount);

          // Try to refresh the handle if it's in the vault
          if (activeFilePath && vaultHandle) {
            try {
              const parts = activeFilePath.split("/");
              let current: FileSystemDirectoryHandle = vaultHandle;

              // Walk the path to get a fresh handle
              for (let i = 0; i < parts.length - 1; i++) {
                current = await current.getDirectoryHandle(parts[i]);
              }
              const freshHandle = await current.getFileHandle(parts[parts.length - 1]);

              if (!handle || handle === activeFileHandle) {
                setActiveFileHandle(freshHandle);
              }

              await new Promise((resolve) => setTimeout(resolve, delay));
              return saveFile(content, freshHandle, retryCount + 1, isAutoSave);
            } catch (retryErr) {
              console.warn("Failed to refresh handle for retry:", retryErr);
            }
          }

          await new Promise((resolve) => setTimeout(resolve, delay));
          return saveFile(content, handle, retryCount + 1, isAutoSave);
        }

        console.error("File System Error:", err?.message || err);
        const errorMsg = err.name === "InvalidStateError" ? "File locked by cloud sync" : err.message;
        setSaveStatus({ state: "error", retryCount, message: errorMsg });
        setTimeout(() => setSaveStatus({ state: "idle", retryCount: 0 }), 5000);

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
    [activeFileHandle, indexVaultTags, setLastSavedContent, setFileLastModified, setFileConflict, setActiveFileHandle, setFileName, vaultHandle, setActiveFilePath, activeFilePath, setSaveStatus],
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
                startIn: currentDirectoryHandle || vaultHandle || undefined,
              });
            } catch (err: any) {
              if (err.name !== "AbortError") throw err;
              return undefined;
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
      link.click();
      URL.revokeObjectURL(url);
      
      // Treat download as successful save contextually
      setLastSavedContent(content);
      setFileConflict(null);
      toast.success("Download started");
      return true;
    },
    [currentDirectoryHandle, vaultHandle, saveFile, setLastSavedContent, setFileConflict],
  );

  const createNewFile = useCallback(async () => {
    const targetDir = currentDirectoryHandle || vaultHandle;
    if (!targetDir) return;

    const name = await dialog.prompt("Enter file name (without .md):", "", "New File");
    if (!name) return;

    const fileName = name.endsWith(".md") ? name : `${name}.md`;
    try {
      const newFileHandle = await targetDir.getFileHandle(fileName, {
        create: true,
      });
      await scanVault(targetDir);
      indexVaultTags();
      await openFile(newFileHandle);
    } catch (err: any) {
      console.error("File System Error:", err?.message || err);
      toast.error("Failed to create file");
    }
  }, [vaultHandle, currentDirectoryHandle, scanVault, indexVaultTags, openFile, dialog]);

  const createNewFolder = useCallback(async () => {
    const targetDir = currentDirectoryHandle || vaultHandle;
    if (!targetDir) return;

    const name = await dialog.prompt("Enter folder name:", "", "New Folder");
    if (!name) return;

    try {
      await targetDir.getDirectoryHandle(name, {
        create: true,
      });
      await scanVault(targetDir);
      toast.success("Folder created: " + name);
    } catch (err: any) {
      console.error("File System Error:", err?.message || err);
      toast.error("Failed to create folder");
    }
  }, [vaultHandle, currentDirectoryHandle, scanVault, dialog]);

      const navigateTo = useCallback(
    async (handle: FileSystemDirectoryHandle) => {
      setCurrentDirectoryHandle(handle);
      await scanVault(handle);
    },
    [setCurrentDirectoryHandle, scanVault],
  );

  const navigateBack = useCallback(async () => {
    if (
      !vaultHandle ||
      !currentDirectoryHandle ||
      vaultHandle.name === currentDirectoryHandle.name
    )
      return;

    setCurrentDirectoryHandle(vaultHandle);
    await scanVault(vaultHandle);
  }, [vaultHandle, currentDirectoryHandle, setCurrentDirectoryHandle, scanVault]);

  const closeVault = useCallback(() => {
    setVaultHandle(null);
    setCurrentDirectoryHandle(null);
    setVaultFiles([]);
    setActiveFileHandle(null);
    setActiveFilePath("draft");
    setIsVaultPending(false);
    
    // Clear open files and reset to just the draft
    setOpenFiles({
      draft: {
        content: "",
        lastSavedContent: "",
        fileName: "untitled",
        activeFilePath: "draft",
      }
    });

    // Reset layout to single pane with draft
    setWorkspaceLayout({
      rootContainer: {
        id: "default-pane",
        type: "editor",
        openFilePaths: ["draft"],
        activeFilePath: "draft",
        isPinned: false
      }
    });
    
    clearVaultHandle();
    toast.success("Vault closed");
  }, [setVaultHandle, setCurrentDirectoryHandle, setVaultFiles, setActiveFileHandle, setActiveFilePath, setIsVaultPending, setOpenFiles, setWorkspaceLayout]);

  const deleteFile = useCallback(
    async (handle: FileSystemHandle) => {
      const type = handle.kind === "file" ? "file" : "folder";
      const confirmed = await dialog.confirm(
        `Are you sure you want to delete this ${type}: ${handle.name}?`,
        "Delete Item",
      );
      if (!confirmed) return;

      const attemptDelete = async (retryCount = 0): Promise<void> => {
        const parentDir = currentDirectoryHandle || vaultHandle;
        if (!parentDir) return;

        try {
          await (parentDir as any).removeEntry(handle.name, { recursive: true });

          // If the active file was inside this deleted item, clear editor
          if (
            activeFileHandle?.name === handle.name ||
            (handle.kind === "directory" && activeFileHandle)
          ) {
            setActiveFileHandle(null);
            setContent("");
            setFileName("");
          }

          await scanVault(parentDir);
          indexVaultTags();
          toast.success(`${handle.name} deleted`);
        } catch (err: any) {
          const isRetryable =
            err.name === "InvalidStateError" ||
            err.name === "NoModificationAllowedError" ||
            err.message?.includes("state had changed") ||
            err.message?.includes("locked");

          if (isRetryable && retryCount < 3) {
            console.warn(`Delete operation issues, retrying (${retryCount + 1})...`);
            await new Promise((resolve) =>
              setTimeout(resolve, 300 * (retryCount + 1)),
            );
            return attemptDelete(retryCount + 1);
          }
          throw err;
        }
      };

      try {
        await attemptDelete();
      } catch (err: any) {
        console.error("File System Error:", err?.message || err);
        toast.error("Failed to delete");
      }
    },
    [
      vaultHandle,
      currentDirectoryHandle,
      activeFileHandle,
      scanVault,
      indexVaultTags,
      setContent,
      setFileName,
      setActiveFileHandle,
      dialog,
    ],
  );

  const renameFile = useCallback(
    async (handle: FileSystemHandle) => {
      const parentDir = currentDirectoryHandle || vaultHandle;
      if (!parentDir) return;

      const newName = await dialog.prompt(
        "Enter new name:",
        handle.name,
        "Rename Item",
      );
      if (!newName || newName === handle.name) return;

      const attemptRename = async (retryCount = 0): Promise<void> => {
        try {
          // 1. Get a FRESH handle from the parent to avoid "state changed" errors
          let freshHandle: FileSystemHandle;
          try {
            if (handle.kind === "file") {
              freshHandle = await (parentDir as any).getFileHandle(handle.name);
            } else {
              freshHandle = await (parentDir as any).getDirectoryHandle(handle.name);
            }
          } catch (e) {
            console.error("Failed to get fresh handle for rename:", e);
            throw new Error("Item no longer exists or is inaccessible");
          }

          // 2. Check if this is the active file
          let isActive = false;
          if (activeFileHandle) {
            try {
              isActive = await (freshHandle as any).isSameEntry(activeFileHandle);
            } catch {
              // Comparison failed
            }
          }

          // 3. Attempt Native Move with Fallback
          let moveSuccessful = false;
          if ((freshHandle as any).move) {
            try {
              // Use explicit parentDir for maximum compatibility on some browsers/OSs
              await (freshHandle as any).move(parentDir, newName);
              moveSuccessful = true;
            } catch (moveErr) {
              console.warn("Native move failed, falling back to copy/delete:", moveErr);
            }
          }

          if (moveSuccessful) {
            if (isActive) {
              setActiveFileHandle(freshHandle as FileSystemFileHandle);
              setFileName(newName.replace(".md", ""));

              // Recalculate path for metadata/tracking
              if (vaultHandle) {
                const pathParts = await (vaultHandle as any).resolve(freshHandle);
                if (pathParts) {
                  setActiveFilePath(pathParts.join("/"));
                } else {
                  setActiveFilePath(newName);
                }
              }
            }
          } else {
            // Fallback for files: manual copy and delete
            if (freshHandle.kind === "file") {
              const file = await (freshHandle as FileSystemFileHandle).getFile();
              const content = await file.text();
              const newFileHandle = await parentDir.getFileHandle(newName, {
                create: true,
              });
              let writable: FileSystemWritableFileStream | null = null;
              try {
                writable = await newFileHandle.createWritable();
                if (writable) {
                  await writable.write(content);
                  await writable.close();
                  writable = null;
                }
                await (parentDir as any).removeEntry(freshHandle.name);

                if (isActive) {
                  setActiveFileHandle(newFileHandle);
                  setFileName(newName.replace(".md", ""));

                  // Recalculate path for metadata/tracking
                  if (vaultHandle) {
                    const pathParts = await (vaultHandle as any).resolve(newFileHandle);
                    if (pathParts) {
                      setActiveFilePath(pathParts.join("/"));
                    } else {
                      setActiveFilePath(newName);
                    }
                  }
                }
              } finally {
                if (writable) {
                  try {
                    await (writable as any).close();
                  } catch {
                    // Ignore cleanup error
                  }
                }
              }
            } else {
              throw new Error("Folder renaming not supported in this browser");
            }
          }
          await scanVault(parentDir);
          indexVaultTags();
          toast.success("Renamed successfully");
        } catch (err: any) {
          const isRetryable =
            err.name === "InvalidStateError" ||
            err.name === "NoModificationAllowedError" ||
            err.message?.includes("state had changed") ||
            err.message?.includes("locked");

          if (isRetryable && retryCount < 3) {
            console.warn(`Rename operation issues, retrying (${retryCount + 1})...`);
            await new Promise((resolve) =>
              setTimeout(resolve, 300 * (retryCount + 1)),
            );
            return attemptRename(retryCount + 1);
          }
          throw err;
        }
      };

      try {
        await attemptRename();
      } catch (err: any) {
        console.error("File System Error:", err?.message || err);
        toast.error(err.message || "Failed to rename");
      }
    },
    [
      vaultHandle,
      currentDirectoryHandle,
      activeFileHandle,
      scanVault,
      indexVaultTags,
      setFileName,
      setActiveFileHandle,
      setActiveFilePath,
      dialog,
    ],
  );

  const moveItem = useCallback(
    async (handle: FileSystemHandle, targetDir: FileSystemDirectoryHandle) => {
      const sourceParent = currentDirectoryHandle || vaultHandle;
      if (!sourceParent || !targetDir) return;

      const attemptMove = async (retryCount = 0): Promise<void> => {
        try {
          // 1. Get a FRESH handle from the parent to avoid "state changed" errors
          let freshHandle: FileSystemHandle;
          try {
            if (handle.kind === "file") {
              freshHandle = await (sourceParent as any).getFileHandle(handle.name);
            } else {
              freshHandle = await (sourceParent as any).getDirectoryHandle(handle.name);
            }
          } catch (e) {
            console.error("Failed to get fresh handle for move:", e);
            throw e;
          }

          // 2. Prevent moving into itself or same directory
          let isSameEntry = false;
          try {
            isSameEntry = await (freshHandle as any).isSameEntry(targetDir);
          } catch {
            // Comparison failed
          }
          if (isSameEntry) {
            toast.error("Cannot move item into itself");
            return;
          }

          let isSameDir = false;
          try {
            isSameDir = await (sourceParent as any).isSameEntry(targetDir);
          } catch {
            // Comparison failed
          }
          if (isSameDir) return;

          let isActive = false;
          if (activeFileHandle) {
            try {
              isActive = await (freshHandle as any).isSameEntry(activeFileHandle);
            } catch {
            // Comparison failed
          }
          }

          // 3. Attempt Native Move, with Fallback
          try {
            if ((freshHandle as any).move) {
              await (freshHandle as any).move(targetDir, freshHandle.name);
              if (isActive) {
                setActiveFileHandle(freshHandle as FileSystemFileHandle);
                
                // Recalculate path for metadata/tracking
                if (vaultHandle) {
                  const pathParts = await (vaultHandle as any).resolve(freshHandle);
                  if (pathParts) {
                    setActiveFilePath(pathParts.join("/"));
                  }
                }
              }
            } else {
              throw new Error("Native move not supported");
            }
          } catch (moveErr: any) {
            // Fallback for files: manual copy and delete
            if (freshHandle.kind === "file") {
              console.warn("Native move failed or unsupported, using fallback:", moveErr);
              const file = await (freshHandle as FileSystemFileHandle).getFile();
              const content = await file.text();
              const newFileHandle = await targetDir.getFileHandle(freshHandle.name, {
                create: true,
              });
              
              let writable: FileSystemWritableFileStream | null = null;
              try {
                writable = await newFileHandle.createWritable();
                if (writable) {
                  await writable.write(content);
                  await writable.close();
                  writable = null;
                }
                await (sourceParent as any).removeEntry(freshHandle.name);

                if (isActive) {
                  setActiveFileHandle(newFileHandle);
                  
                  // Recalculate path for metadata/tracking
                  if (vaultHandle) {
                    const pathParts = await (vaultHandle as any).resolve(newFileHandle);
                    if (pathParts) {
                      setActiveFilePath(pathParts.join("/"));
                    }
                  }
                }
              } finally {
                if (writable) {
                  try {
                    await (writable as any).close();
                  } catch {
                    // Ignore cleanup error
                  }
                }
              }
            } else {
              throw moveErr;
            }
          }

          await scanVault(sourceParent);
          indexVaultTags();
          toast.success(`Moved ${handle.name} to ${targetDir.name}`);
        } catch (err: any) {
          // If locked or stale, retry a few times
          const isRetryable = 
            err.name === "NoModificationAllowedError" || 
            err.name === "InvalidStateError" ||
            err.message?.includes("locked") || 
            err.message?.includes("state had changed");

          if (isRetryable && retryCount < 3) {
            console.warn(`Move operation issues (locked/stale), retrying (${retryCount + 1})...`);
            await new Promise((resolve) => setTimeout(resolve, 300 * (retryCount + 1)));
            return attemptMove(retryCount + 1);
          }
          throw err;
        }
      };

      try {
        await attemptMove();
      } catch (err: any) {
        console.error("File System Error:", err?.message || err);
        toast.error(err.message || "Failed to move item");
      }
    },
    [
      vaultHandle,
      currentDirectoryHandle,
      activeFileHandle,
      scanVault,
      indexVaultTags,
      setActiveFileHandle,
      setActiveFilePath,
    ],
  );

  const importFile = useCallback(async () => {
    // 1. Try Desktop File System Access API
    if ("showOpenFilePicker" in window) {
      try {
        const handle = await withPickerLock(async () => {
          try {
            const [handle] = await (window as any).showOpenFilePicker({
              types: [
                {
                  description: "Markdown",
                  accept: { "text/markdown": [".md", ".txt", ".markdown"] },
                },
              ],
              startIn: currentDirectoryHandle || vaultHandle || undefined,
            });
            return handle;
          } catch (err: any) {
            if (err.name !== "AbortError") throw err;
            return undefined;
          }
        });

        if (handle) {
          await openFile(handle);
          return true;
        }
        return false;
      } catch (err: any) {
        console.error("Picker failed, trying fallback:", err);
      }
    }
    return null; // Signals to use fallback input
  }, [currentDirectoryHandle, vaultHandle, openFile]);

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

  return {
    vaultHandle,
    currentDirectoryHandle,
    activeFileHandle,
    vaultFiles,
    openVault,
    closeVault,
    openFile,
    importFile,
    openFileByName,
    saveFile,
    exportFile,
    scanVault,
    createNewFile,
    createNewFolder,
    navigateTo,
    navigateBack,
    deleteFile,
    renameFile,
    moveItem,
    indexVaultTags,
    restoreVault,
    isVaultPending,
    isVaultSupported: isVaultSupportedMounted,
    isIdbSupported: isIdbSupportedMounted,
    isMounted: mounted,
  };
}
