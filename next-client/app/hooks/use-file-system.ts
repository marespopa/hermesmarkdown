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
  const [lastSavedContent, setLastSavedContent] = useAtom(atom_lastSavedContent);
  const [, setFileLastModified] = useAtom(atom_fileLastModified);
  const [, setFileConflict] = useAtom(atom_fileConflict);
  const [, setPendingFileSwitch] = useAtom(atom_pendingFileSwitch);
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
      } catch (err) {
        console.error("Failed to index active file:", err);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [content, activeFileHandle, vaultHandle, activeFilePath]);

  const scanVault = useCallback(
    async (handle: FileSystemDirectoryHandle) => {
      const entries: FileSystemHandle[] = [];
      for await (const entry of (handle as any).values()) {
        if (entry.kind === "file" && entry.name.endsWith(".md")) {
          entries.push(entry);
        } else if (entry.kind === "directory") {
          entries.push(entry);
        }
      }
      setVaultFiles(entries.sort((a, b) => a.name.localeCompare(b.name)));
    },
    [setVaultFiles],
  );

  const indexVaultTags = useCallback(
    async (passedHandle?: FileSystemDirectoryHandle) => {
      const handle = passedHandle || vaultHandle;
      if (!handle || !metadataWorker) return;

      const fileHandles: { handle: FileSystemFileHandle; path: string }[] = [];

      async function collectFiles(
        dirHandle: FileSystemDirectoryHandle,
        path: string = "",
      ) {
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
      }

      await collectFiles(handle);
      metadataWorker.postMessage({ files: fileHandles });
    },
    [vaultHandle],
  );

  const openVault = useCallback(async () => {
    if (!isVaultSupported) {
      toast.error("Your browser does not support local folder access. Try Chrome or Edge.");
      return;
    }

    try {
      const handle = await window.showDirectoryPicker();
      setVaultHandle(handle);
      setCurrentDirectoryHandle(handle);
      setIsVaultPending(false);
      await saveVaultHandle(handle);
      await scanVault(handle);
      await indexVaultTags(handle);
      toast.success("Vault opened: " + handle.name);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error(err);
        toast.error("Failed to open vault");
      }
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
      `Hermes needs your permission to "allow this site to make edits" to your local folder: ${vaultHandle.name}. This is required to save your notes. Your file content is never saved on our servers—everything stays 100% local on your device.`,
      "Re-authorize Vault Access",
      "Allow Edits",
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
    } catch (err) {
      console.error(err);
      toast.error("Failed to restore vault");
    }
  }, [vaultHandle, setIsVaultPending, setCurrentDirectoryHandle, scanVault, indexVaultTags, dialog]);

  const openFile = useCallback(
    async (
      fileHandle: FileSystemFileHandle,
      providedPath?: string,
      force: boolean = false,
    ) => {
      // Check for unsaved changes
      const isDirty = content !== lastSavedContent;
      if (isDirty && !force) {
        setPendingFileSwitch({ handle: fileHandle, path: providedPath });
        return;
      }

      try {
        const file = await fileHandle.getFile();
        const content = await file.text();
        setContent(content);
        setLastSavedContent(content);
        setFileLastModified(file.lastModified);
        setFileConflict(null);
        setFileName(fileHandle.name.replace(".md", ""));
        setActiveFileHandle(fileHandle);

        let path = providedPath;
        if (!path && vaultHandle) {
          const pathParts = await (vaultHandle as any).resolve(fileHandle);
          if (pathParts) {
            path = pathParts.join("/");
          } else {
            // Fallback: If resolve fails, try to find the path in metadata
            for (const [metaPath, meta] of Object.entries(fileMetadata)) {
              if (await (meta.handle as any).isSameEntry(fileHandle)) {
                path = metaPath;
                break;
              }
            }
          }
        }
        setActiveFilePath(path || fileHandle.name);
      } catch (err) {
        console.error(err);
        toast.error("Failed to open file");
      }
    },
    [
      setContent,
      setFileName,
      setActiveFileHandle,
      setActiveFilePath,
      vaultHandle,
      fileMetadata,
      setLastSavedContent,
      setFileLastModified,
      setFileConflict,
      content,
      lastSavedContent,
      setPendingFileSwitch,
    ],
  );

  const saveFile = useCallback(
    async (content: string, handle?: FileSystemFileHandle) => {
      const fileToSave = handle || activeFileHandle;
      if (!fileToSave) return false;

      let writable: FileSystemWritableFileStream | null = null;
      try {
        writable = await fileToSave.createWritable();
        if (writable) {
          await writable.write(content);
          await writable.close();
          writable = null;
        }

        // Update metadata after successful save to prevent false conflict triggers
        const updatedFile = await fileToSave.getFile();
        setLastSavedContent(content);
        setFileLastModified(updatedFile.lastModified);
        setFileConflict(null);

        await indexVaultTags();
        toast.success("Saved to " + fileToSave.name);
        return true;
      } catch (err) {
        console.error(err);
        toast.error("Failed to save file");
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
    [activeFileHandle, indexVaultTags, setLastSavedContent, setFileLastModified, setFileConflict],
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
      await indexVaultTags();
      await openFile(newFileHandle);
    } catch (err) {
      console.error(err);
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
    } catch (err) {
      console.error(err);
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
    setActiveFilePath(null);
    setIsVaultPending(false);
    clearVaultHandle();
    toast.success("Vault closed");
  }, [setVaultHandle, setCurrentDirectoryHandle, setVaultFiles, setActiveFileHandle, setActiveFilePath, setIsVaultPending]);

  const deleteFile = useCallback(
    async (handle: FileSystemHandle) => {
      const parentDir = currentDirectoryHandle || vaultHandle;
      if (!parentDir) return;

      const type = handle.kind === "file" ? "file" : "folder";
      const confirmed = await dialog.confirm(
        `Are you sure you want to delete this ${type}: ${handle.name}?`,
        "Delete Item",
      );
      if (!confirmed) return;

      try {
        await (parentDir as any).removeEntry(handle.name, { recursive: true });

        // If the active file was inside this deleted item, clear editor
        if (
          activeFileHandle?.name === handle.name ||
          (handle.kind === "directory" && activeFileHandle)
        ) {
          // Basic check: we don't have full path, so if a folder is deleted,
          // we might want to refresh or check if active handle still exists
          setActiveFileHandle(null);
          setContent("");
          setFileName("");
        }

        await scanVault(parentDir);
        await indexVaultTags();
        toast.success(`${handle.name} deleted`);
      } catch (err) {
        console.error(err);
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

      try {
        // 1. Get a FRESH handle from the parent to avoid "state changed" errors
        let freshHandle: FileSystemHandle;
        if (handle.kind === "file") {
          freshHandle = await (parentDir as any).getFileHandle(handle.name);
        } else {
          freshHandle = await (parentDir as any).getDirectoryHandle(handle.name);
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

        // 3. Attempt Native Move
        if ((freshHandle as any).move) {
          // Use explicit parentDir for maximum compatibility on some browsers/OSs
          await (freshHandle as any).move(parentDir, newName);

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
        await indexVaultTags();
        toast.success("Renamed successfully");
      } catch (err: any) {
        console.error(err);
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
          await indexVaultTags();
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
        console.error(err);
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
        await openFile(exactMatch.handle);
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
        await openFile(fuzzyMatch.handle);
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
    openFileByName,
    saveFile,
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
  };
}
