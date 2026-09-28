"use client";

import { useAtom, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";
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
  atom_isCloudVault,
  atom_fileSystemVersion,
  atom_indexerState,
  atom_vaultDescriptor,
  type VaultDescriptor,
} from "@/app/atoms/atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import {
  saveVaultHandle,
  loadVaultHandle,
  clearVaultHandle,
  verifyPermission,
  queryPermission,
  saveGitHubVaultDescriptor,
  saveBrowserVaultDescriptor,
  saveGitHubVaultManifest,
} from "@/app/services/idb";
import {
  materializeGitHubVault,
  createGitHubVaultManifestFromFiles,
  type GitHubVaultDescriptor,
  type GitHubVaultRemoteFile,
} from "@/app/services/github-vault-workspace";
import { metadataWorker, withPickerLock, isVaultSupported, isIdbSupported } from "./shared";
import {
  collectVaultFiles,
  isCloudFolderName,
  isSameDirectory,
  listDirectoryEntries,
  metadataForFiles,
  readFilesForIndexing,
  resolveParentDirectory,
  singlePaneLayout,
} from "./vault-scan";
import { useMetadataWorkerResults } from "./use-metadata-worker-results";
import { atom_showHiddenFiles, atom_browserVaultDialogOpen } from "@/app/atoms/ui-atoms";
import { loadStoredWorkspace } from "./stored-workspace";

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
  const [, setIsCloudVault] = useAtom(atom_isCloudVault);
  const [, setVaultDescriptor] = useAtom(atom_vaultDescriptor);
  const [, setFileSystemVersion] = useAtom(atom_fileSystemVersion);
  const [showHiddenFiles] = useAtom(atom_showHiddenFiles);
  const rebindHandles = useSetAtom(atom_rebindHandles);
  const setIndexerState = useSetAtom(atom_indexerState);
  const setBrowserVaultDialogOpen = useSetAtom(atom_browserVaultDialogOpen);
  const pendingHandlesRef = useRef<Map<string, FileSystemFileHandle>>(new Map());

  const detectCloudVault = useCallback(
    (handle: FileSystemDirectoryHandle) => {
      const isCloud = isCloudFolderName(handle.name);
      
      if (isCloud) {
        setIsCloudVault(true);
        console.info(`Cloud folder detected: ${handle.name}. Enabling enhanced error recovery.`);
        toast.success("Cloud sync detected. Enhanced recovery enabled.", {
          icon: "☁️",
          id: "cloud-detect-toast",
        });
      }
      return isCloud;
    },
    [setIsCloudVault],
  );

  const scanVault = useCallback(
    // `showHiddenOverride` lets callers that just flipped atom_showHiddenFiles
    // (e.g. the Settings toggle) pass the new value directly — `showHiddenFiles`
    // here would otherwise still read the pre-update value, since setState from
    // the same event handler hasn't re-rendered (and re-closed this callback)
    // yet by the time the caller invokes scanVault.
    async (handle: FileSystemDirectoryHandle, showHiddenOverride?: boolean) => {
      const includeHidden = showHiddenOverride ?? showHiddenFiles;
      try {
        setFileSystemVersion((v) => v + 1);
        setVaultFiles(await listDirectoryEntries(vaultHandle, handle, includeHidden));
      } catch (err: any) {
        console.warn("Failed to scan vault:", err);
      }
    },
    [setVaultFiles, vaultHandle, setFileSystemVersion, showHiddenFiles],
  );

  const indexVaultTags = useCallback(
    async (passedHandle?: FileSystemDirectoryHandle, showHiddenOverride?: boolean) => {
      const includeHidden = showHiddenOverride ?? showHiddenFiles;
      try {
        const handle = passedHandle || vaultHandle;
        if (!handle) return;

        setIndexerState({ status: "compiling", count: 0 });
        const { files: fileHandles, failedSubdirs: subdirFailCount, timedOut } = await collectVaultFiles(handle, includeHidden);

        if (timedOut) {
          toast.error(
            "Indexing is taking a while — some folders may be very large. Showing what we found so far.",
            { id: "index-timeout", duration: 6000 },
          );
        }

        if (subdirFailCount > 0) {
          toast.error(
            `Could not read ${subdirFailCount} subfolder(s). Grant full folder access and re-open the vault.`,
            { id: "subdir-access-error", duration: 6000 },
          );
        }

        // Fresh vault open: replace metadata entirely so stale entries from a
        // previous vault never block display. Re-index after save / periodic
        // sync: keep parsed metadata, refresh handles, drop files gone from disk.
        setFileMetadata((prev) => metadataForFiles(fileHandles, passedHandle ? undefined : prev));

        // Tag extraction is secondary; the visible state above never waits for it.
        const readable = await readFilesForIndexing(fileHandles);

        // Store handles locally so we can re-attach them after the worker responds
        pendingHandlesRef.current = new Map(fileHandles.map((f) => [f.path, f.handle]));

        if (metadataWorker && readable.length > 0) {
          metadataWorker.postMessage({ files: readable });
        } else {
          setIndexerState("idle");
        }
      } catch (err: any) {
        console.error("Failed to index vault tags:", err);
        setIndexerState("idle");
      }
    },
    [vaultHandle, setIndexerState, setFileMetadata, showHiddenFiles],
  );

  const initVaultFromHandle = useCallback(async (
    handle: FileSystemDirectoryHandle,
    options?: {
      isNewVault?: boolean;
      descriptor?: VaultDescriptor;
      persist?: boolean;
      announce?: boolean;
    }
  ) => {
    const {
      isNewVault = false,
      descriptor = { kind: "local" },
      persist = true,
      announce = true,
    } = options ?? {};

    setFileMetadata({});
    setOpenFiles({});
    setWorkspaceLayout(singlePaneLayout([], null));
    setVaultHandle(handle);
    setVaultDescriptor(descriptor);
    setCurrentDirectoryHandle(handle);
    setIsVaultPending(false);
    setIsCloudVault(false);
    if (descriptor.kind === "local") {
      detectCloudVault(handle);
      if (persist) await saveVaultHandle(handle);
    } else if (persist) {
      if (descriptor.kind === "browser") await saveBrowserVaultDescriptor(descriptor);
      else await saveGitHubVaultDescriptor(descriptor);
    }
    await scanVault(handle);
    await indexVaultTags(handle);
    await rebindHandles(handle);

    if (announce) {
      const vaultName = descriptor.kind === "local" ? handle.name : descriptor.displayName;
      toast.success(isNewVault ? `Vault created: ${vaultName}` : `Vault opened: ${vaultName}`);
    }
  }, [setVaultHandle, setVaultDescriptor, setCurrentDirectoryHandle, setIsVaultPending, setFileMetadata, setOpenFiles, setWorkspaceLayout, setIsCloudVault, scanVault, indexVaultTags, rebindHandles, detectCloudVault]);

  const initGitHubVault = useCallback(async (
    descriptor: GitHubVaultDescriptor,
    files: readonly GitHubVaultRemoteFile[] = [],
  ) => {
    // Materialize before opening so scan/index never observes a partial remote vault.
    const workspace = await materializeGitHubVault(descriptor, files);
    await saveGitHubVaultManifest(descriptor, createGitHubVaultManifestFromFiles(descriptor.baseHeadSha, files));
    await initVaultFromHandle(workspace, { descriptor });
  }, [initVaultFromHandle]);

  const openVault = useCallback(async (): Promise<boolean> => {
    if (!isVaultSupported) {
      // No disk folder access here (Safari, Firefox, mobile): offer vaults
      // kept in browser storage instead.
      setBrowserVaultDialogOpen(true);
      return false;
    }

    const handle = await withPickerLock(async () => {
      try {
        return await window.showDirectoryPicker({ mode: "readwrite" });
      } catch (err: any) {
        if (err.name === "AbortError" || err.name === "NotAllowedError") return undefined;
        throw err;
      }
    });

    if (!handle) return false;

    try {
      await initVaultFromHandle(handle);
      return true;
    } catch (err: any) {
      console.error("File System Error:", err?.message || err);
      toast.error("Failed to open vault");
      return false;
    }
  }, [initVaultFromHandle, setBrowserVaultDialogOpen]);

  const restoreVault = useCallback(async () => {
    if (!vaultHandle) return;

    try {
      const granted = await verifyPermission(vaultHandle);
      if (granted) {
        setIsVaultPending(false);
        setCurrentDirectoryHandle(vaultHandle);
        setIsCloudVault(false);
        detectCloudVault(vaultHandle);
        await scanVault(vaultHandle);
        await indexVaultTags(vaultHandle);
        await rebindHandles(vaultHandle);
        toast.success("Vault restored");
      }
    } catch (err: any) {
      console.error("File System Error:", err?.message || err);
      toast.error("Failed to restore vault");
    }
  }, [vaultHandle, setIsVaultPending, setCurrentDirectoryHandle, setIsCloudVault, scanVault, indexVaultTags, rebindHandles, detectCloudVault]);

  const syncCurrentDirectoryToPath = useCallback(
    async (path: string) => {
      if (!vaultHandle || !path || path === "draft") return false;

      let targetHandle: FileSystemDirectoryHandle;
      try {
        targetHandle = await resolveParentDirectory(vaultHandle, path);
      } catch (err: any) {
        if (err?.name === "NotAllowedError" || err?.name === "SecurityError") {
          setIsVaultPending(true);
          return false;
        }
        console.warn("Failed to find parent directory for path:", path, err);
        return false;
      }

      const isSame = !!currentDirectoryHandle && await isSameDirectory(targetHandle, currentDirectoryHandle);

      if (!isSame) {
        setCurrentDirectoryHandle(targetHandle);
        await scanVault(vaultHandle);
      }
      return true;
    },
    [vaultHandle, currentDirectoryHandle, setCurrentDirectoryHandle, setIsVaultPending, scanVault],
  );

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
    setFileMetadata({});
    setActiveFileHandle(null);
    setActiveFilePath("draft");
    setIsVaultPending(false);
    setIsCloudVault(false);
    setVaultDescriptor(null);
    
    setOpenFiles({
      draft: {
        content: "",
        lastSavedContent: "",
        fileName: "untitled",
        activeFilePath: "draft",
      }
    });

    setWorkspaceLayout(singlePaneLayout(["draft"], "draft"));

    clearVaultHandle();
    toast.success("Vault closed");
  }, [setVaultHandle, setCurrentDirectoryHandle, setVaultFiles, setFileMetadata, setActiveFileHandle, setActiveFilePath, setIsVaultPending, setOpenFiles, setWorkspaceLayout, setIsCloudVault, setVaultDescriptor]);

  useMetadataWorkerResults(pendingHandlesRef);

  // Load vault on mount
  useEffect(() => {
    if (hasLoadedVault || !isIdbSupported) return;

    async function init() {
      setHasLoadedVault(true);
      const savedHandle = await loadVaultHandle();
      if (savedHandle) {
        setVaultHandle(savedHandle);
        setVaultDescriptor({ kind: "local" });
        // Only query permission on mount — requestPermission requires a user
        // gesture and will throw a SecurityError if called automatically.
        const granted = await queryPermission(savedHandle);
        if (granted) {
          setCurrentDirectoryHandle(savedHandle);
          detectCloudVault(savedHandle);
          await scanVault(savedHandle);
          await indexVaultTags(savedHandle);
          await rebindHandles(savedHandle);
        } else {
          setIsVaultPending(true);
        }
        return;
      }

      // Browser-storage vaults need no permission prompt.
      try {
        const stored = await loadStoredWorkspace();
        if (stored) {
          await initVaultFromHandle(stored.handle, {
            descriptor: stored.descriptor,
            persist: false,
            announce: false,
          });
        }
      } catch (err) {
        console.error("Failed to restore vault from browser storage:", err);
        toast.error("Failed to restore the vault from browser storage.");
      }
    }
    init();
  }, [setVaultHandle, setVaultDescriptor, setIsVaultPending, hasLoadedVault, setHasLoadedVault, setCurrentDirectoryHandle, scanVault, indexVaultTags, rebindHandles, detectCloudVault, initVaultFromHandle]);

  return {
    vaultHandle,
    currentDirectoryHandle,
    isVaultPending,
    scanVault,
    indexVaultTags,
    initVaultFromHandle,
    initGitHubVault,
    openVault,
    restoreVault,
    closeVault,
    navigateTo,
    navigateBack,
    syncCurrentDirectoryToPath,
  };
}
