"use client";

import { useAtom, useSetAtom } from "jotai";
import { useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import {
  atom_vaultHandle,
  atom_currentDirectoryHandle,
  atom_vaultFiles,
  atom_isVaultPending,
  atom_hasLoadedVault,
  atom_activeFileHandle,
  atom_activeFilePath,
  atom_openFiles,
  atom_workspaceLayout,
  atom_rebindHandles,
} from "@/app/atoms/atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import {
  saveVaultHandle,
  loadVaultHandle,
  clearVaultHandle,
  verifyPermission,
} from "@/app/services/idb";
import { useDialog } from "../use-dialog";
import { metadataWorker, withPickerLock, isVaultSupported, isIdbSupported } from "./shared";

export function useVaultManager() {
  const [vaultHandle, setVaultHandle] = useAtom(atom_vaultHandle);
  const [currentDirectoryHandle, setCurrentDirectoryHandle] = useAtom(atom_currentDirectoryHandle);
  const [, setVaultFiles] = useAtom(atom_vaultFiles);
  const [isVaultPending, setIsVaultPending] = useAtom(atom_isVaultPending);
  const [hasLoadedVault, setHasLoadedVault] = useAtom(atom_hasLoadedVault);
  const [, setFileMetadata] = useAtom(atom_fileMetadata);
  const [, setActiveFileHandle] = useAtom(atom_activeFileHandle);
  const [, setActiveFilePath] = useAtom(atom_activeFilePath);
  const [, setOpenFiles] = useAtom(atom_openFiles);
  const [, setWorkspaceLayout] = useAtom(atom_workspaceLayout);
  const rebindHandles = useSetAtom(atom_rebindHandles);
  const dialog = useDialog();

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
        if (err.name === "AbortError" || err.name === "NotAllowedError") return undefined;
        throw err;
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
      await rebindHandles(handle);
      toast.success("Vault opened: " + handle.name);
    } catch (err: any) {
      console.error("File System Error:", err?.message || err);
      toast.error("Failed to open vault");
    }
  }, [setVaultHandle, setCurrentDirectoryHandle, setIsVaultPending, scanVault, indexVaultTags, rebindHandles]);

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
        await rebindHandles(vaultHandle);
        toast.success("Vault restored");
      }
    } catch (err: any) {
      console.error("File System Error:", err?.message || err);
      toast.error("Failed to restore vault");
    }
  }, [vaultHandle, setIsVaultPending, setCurrentDirectoryHandle, scanVault, indexVaultTags, rebindHandles, dialog]);

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
    
    setOpenFiles({
      draft: {
        content: "",
        lastSavedContent: "",
        fileName: "untitled.md",
        activeFilePath: "draft",
      }
    });

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

  return {
    vaultHandle,
    currentDirectoryHandle,
    isVaultPending,
    scanVault,
    indexVaultTags,
    openVault,
    restoreVault,
    closeVault,
    navigateTo,
    navigateBack,
  };
}
