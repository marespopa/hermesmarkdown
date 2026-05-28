"use client";

import { useAtom } from "jotai";
import {
  atom_vaultHandle,
  atom_currentDirectoryHandle,
  atom_activeFileHandle,
  atom_vaultFiles,
  atom_vaultTags,
  atom_isVaultPending,
  atom_hasLoadedVault,
  atom_content,
  atom_fileName,
} from "@/app/atoms/atoms";
import { useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import {
  saveVaultHandle,
  loadVaultHandle,
  clearVaultHandle,
  verifyPermission,
} from "@/app/services/idb";

export function useFileSystem() {
  const [vaultHandle, setVaultHandle] = useAtom(atom_vaultHandle);
  const [currentDirectoryHandle, setCurrentDirectoryHandle] = useAtom(atom_currentDirectoryHandle);
  const [activeFileHandle, setActiveFileHandle] = useAtom(atom_activeFileHandle);
  const [vaultFiles, setVaultFiles] = useAtom(atom_vaultFiles);
  const [vaultTags, setVaultTags] = useAtom(atom_vaultTags);
  const [isVaultPending, setIsVaultPending] = useAtom(atom_isVaultPending);
  const [hasLoadedVault, setHasLoadedVault] = useAtom(atom_hasLoadedVault);
  const [, setContent] = useAtom(atom_content);
  const [, setFileName] = useAtom(atom_fileName);

  const scanVault = useCallback(
    async (handle: FileSystemDirectoryHandle) => {
      const entryMap = new Map<string, FileSystemHandle>();
      for await (const entry of (handle as any).values()) {
        if (entry.kind === "file" && entry.name.endsWith(".md")) {
          entryMap.set(entry.name, entry);
        } else if (entry.kind === "directory") {
          entryMap.set(entry.name, entry);
        }
      }
      const entries = Array.from(entryMap.values());
      setVaultFiles(entries.sort((a, b) => a.name.localeCompare(b.name)));
    },
    [setVaultFiles],
  );

  const indexVaultTags = useCallback(async (passedHandle?: FileSystemDirectoryHandle) => {
    const handle = passedHandle || vaultHandle;
    if (!handle) return;

    const tagMap: Record<string, FileSystemFileHandle[]> = {};
    const REGEX_HASHTAG = /(^|\s)(#[\w-]+)(?=\s|$)/gim;

    async function scanRecursive(dirHandle: FileSystemDirectoryHandle) {
      for await (const entry of (dirHandle as any).values()) {
        if (entry.kind === "file" && entry.name.endsWith(".md")) {
          try {
            const file = await (entry as FileSystemFileHandle).getFile();
            const content = await file.text();
            const matches = content.match(REGEX_HASHTAG);
            if (matches) {
              const uniqueTagsInFile = new Set(
                matches.map((m) => m.trim().toLowerCase())
              );
              
              uniqueTagsInFile.forEach((tag) => {
                if (!tagMap[tag]) tagMap[tag] = [];
                // To prevent duplicate keys in the UI, we still check by name, 
                // but we should ideally use a path if we could.
                // For now, ensuring at least we don't add the same handle twice 
                // if it's encountered multiple times for some reason.
                if (!tagMap[tag].some((f) => f.name === entry.name)) {
                  tagMap[tag].push(entry as FileSystemFileHandle);
                }
              });
            }
          } catch (err) {
            console.error(`Index error for ${entry.name}:`, err);
          }
        } else if (entry.kind === "directory") {
          await scanRecursive(entry);
        }
      }
    }

    await scanRecursive(handle);
    setVaultTags(tagMap);
  }, [vaultHandle, setVaultTags]);

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
    async (fileHandle: FileSystemFileHandle) => {
      try {
        const file = await fileHandle.getFile();
        const content = await file.text();
        setContent(content);
        setFileName(fileHandle.name.replace(".md", ""));
        setActiveFileHandle(fileHandle);
      } catch (err) {
        console.error(err);
        toast.error("Failed to open file");
      }
    },
    [setContent, setFileName, setActiveFileHandle],
  );

  const saveFile = useCallback(
    async (content: string, handle?: FileSystemFileHandle) => {
      const fileToSave = handle || activeFileHandle;
      if (!fileToSave) return false;

      try {
        const writable = await fileToSave.createWritable();
        await writable.write(content);
        await writable.close();
        await indexVaultTags();
        toast.success("Saved to " + fileToSave.name);
        return true;
      } catch (err) {
        console.error(err);
        toast.error("Failed to save file");
        return false;
      }
    },
    [activeFileHandle, indexVaultTags],
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
    setIsVaultPending(false);
    clearVaultHandle();
    toast.success("Vault closed");
  }, [setVaultHandle, setCurrentDirectoryHandle, setVaultFiles, setActiveFileHandle, setIsVaultPending]);

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
    navigateTo,
    navigateBack,
    deleteFile,
    renameFile,
    indexVaultTags,
    vaultTags,
    restoreVault,
    isVaultPending,
  };
}
