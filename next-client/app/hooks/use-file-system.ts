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
} from "@/app/atoms/atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { useCallback, useEffect } from "react";
import toast from "react-hot-toast";
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
  const [, setLastSavedContent] = useAtom(atom_lastSavedContent);
  const [, setFileLastModified] = useAtom(atom_fileLastModified);
  const [, setFileConflict] = useAtom(atom_fileConflict);

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
    if (hasLoadedVault) return;
    
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
  }, [vaultHandle, setIsVaultPending, setCurrentDirectoryHandle, scanVault, indexVaultTags]);

  const openFile = useCallback(
    async (fileHandle: FileSystemFileHandle, providedPath?: string) => {
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
    ],
  );

  const saveFile = useCallback(
    async (content: string, handle?: FileSystemFileHandle) => {
      const fileToSave = handle || activeFileHandle;
      if (!fileToSave) return false;

      try {
        const writable = await fileToSave.createWritable();
        await writable.write(content);
        await writable.close();

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
      }
    },
    [activeFileHandle, indexVaultTags, setLastSavedContent, setFileLastModified, setFileConflict],
  );

  const createNewFile = useCallback(async () => {
    const targetDir = currentDirectoryHandle || vaultHandle;
    if (!targetDir) return;
    
    const name = prompt("Enter file name (without .md):");
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
      }, [vaultHandle, currentDirectoryHandle, scanVault, indexVaultTags, openFile]);

      const createNewFolder = useCallback(async () => {
      const targetDir = currentDirectoryHandle || vaultHandle;
      if (!targetDir) return;

      const name = prompt("Enter folder name:");
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
      }, [vaultHandle, currentDirectoryHandle, scanVault]);

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
      if (!confirm(`Are you sure you want to delete this ${type}: ${handle.name}?`)) return;

      try {
        await (parentDir as any).removeEntry(handle.name, { recursive: true });
        
        // If the active file was inside this deleted item, clear editor
        if (activeFileHandle?.name === handle.name || (handle.kind === "directory" && activeFileHandle)) {
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
    ],
  );

  const renameFile = useCallback(
    async (handle: FileSystemHandle) => {
      const parentDir = currentDirectoryHandle || vaultHandle;
      if (!parentDir) return;

      const newName = prompt("Enter new name:", handle.name);
      if (!newName || newName === handle.name) return;

      try {
        if ((handle as any).move) {
          await (handle as any).move(newName);
        } else {
          if (handle.kind === "file") {
            const file = await (handle as FileSystemFileHandle).getFile();
            const content = await file.text();
            const newFileHandle = await parentDir.getFileHandle(newName, {
              create: true,
            });
            const writable = await newFileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            await (parentDir as any).removeEntry(handle.name);
            if (activeFileHandle?.name === handle.name) {
              setActiveFileHandle(newFileHandle);
              setFileName(newName.replace(".md", ""));
            }
          } else {
            // For directories, without move() it's too complex/risky to do recursive copy-delete
            // most modern browsers supporting showDirectoryPicker also support move()
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
    ],
  );

  const openFileByName = useCallback(
    async (name: string) => {
      const fileName = name.endsWith(".md") ? name : `${name}.md`;
      const fileHandle = vaultFiles.find(
        (f) =>
          f.kind === "file" && f.name.toLowerCase() === fileName.toLowerCase(),
      );

      if (fileHandle) {
        await openFile(fileHandle as FileSystemFileHandle);
      } else {
        toast.error(`File not found: ${name}`);
      }
    },
    [vaultFiles, openFile],
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
    indexVaultTags,
    restoreVault,
    isVaultPending,
  };
}
