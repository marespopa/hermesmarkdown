"use client";

import { useAtom, useSetAtom, useStore } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
  atom_vaultHandle,
  atom_currentDirectoryHandle,
  atom_vaultFiles,
  atom_isVaultPending,
  atom_hasLoadedVault,
  atom_isVaultRestoring,
  atom_isVaultUnlocking,
  atom_activeFileHandle,
  atom_activeFilePath,
  atom_openFiles,
  atom_workspaceLayout,
  atom_rebindHandles,
  atom_isCloudVault,
  atom_fileSystemVersion,
  atom_indexerState,
  atom_vaultDescriptor,
  atom_vaultKey,
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
  listDirectoryEntries,
  metadataForFiles,
  readFilesForIndexing,
  singlePaneLayout,
} from "./vault-scan";
import { indexVaultFiles, parseWithWorker, reportCollectProblems } from "./vault-index";
import { useVaultNavigation } from "./use-vault-navigation";
import { indexNoteContent, markContentIndexed, needsContentIndex } from "@/app/services/content-search-client";
import { loadMetadataCache, saveMetadataCache } from "@/app/services/metadata-cache";
import { atom_showHiddenFiles, atom_browserVaultDialogOpen } from "@/app/atoms/ui-atoms";
import { loadStoredWorkspace } from "./stored-workspace";

export function useVaultManager() {
  const [vaultHandle, setVaultHandle] = useAtom(atom_vaultHandle);
  const [currentDirectoryHandle, setCurrentDirectoryHandle] = useAtom(atom_currentDirectoryHandle);
  const [, setVaultFiles] = useAtom(atom_vaultFiles);
  const [isVaultPending, setIsVaultPending] = useAtom(atom_isVaultPending);
  const [hasLoadedVault, setHasLoadedVault] = useAtom(atom_hasLoadedVault);
  const setIsVaultRestoring = useSetAtom(atom_isVaultRestoring);
  const setIsVaultUnlocking = useSetAtom(atom_isVaultUnlocking);
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
  const store = useStore();
  // Each indexing run takes a number; an older run stops once a newer one starts.
  const indexRunRef = useRef(0);

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

        const run = ++indexRunRef.current;
        setIndexerState({ status: "compiling", count: 0 });
        const { files: fileHandles, failedSubdirs: subdirFailCount, timedOut } = await collectVaultFiles(handle, includeHidden);

        reportCollectProblems(timedOut, subdirFailCount);

        if (indexRunRef.current !== run) return;

        // Without a worker, list the notes with no parsed metadata. Fresh
        // vault open replaces metadata entirely; re-index keeps earlier
        // parses, refreshes handles and drops files gone from disk.
        if (!metadataWorker) {
          setFileMetadata((prev) => metadataForFiles(fileHandles, passedHandle ? undefined : prev));
          setIndexerState("idle");
          return;
        }

        // Dates first, cached parses reused, the rest parsed newest first in
        // the background, then the note-text backfill (see vault-index.ts).
        // Read the vault key from the store: right after a vault opens, this
        // callback's closure is stale.
        const vaultKey = store.get(atom_vaultKey);
        const worker = metadataWorker;
        const { done, contentDone } = await indexVaultFiles(fileHandles, !!passedHandle, {
          loadCache: () => (vaultKey ? loadMetadataCache(vaultKey) : Promise.resolve(null)),
          saveCache: (entries) => (vaultKey ? saveMetadataCache(vaultKey, entries) : Promise.resolve()),
          read: readFilesForIndexing,
          // The worker also indexes the text of every note it parses.
          parse: (files) => {
            markContentIndexed(files);
            return parseWithWorker(worker, files);
          },
          setMetadata: setFileMetadata,
          isCurrent: () => indexRunRef.current === run,
          needsContent: needsContentIndex,
          indexContent: indexNoteContent,
        });
        void contentDone.catch((err) => console.error("Failed to index note text:", err));
        void done
          .catch((err) => console.error("Failed to parse vault metadata:", err))
          .finally(() => {
            if (indexRunRef.current === run) setIndexerState("idle");
          });
      } catch (err: any) {
        console.error("Failed to index vault tags:", err);
        setIndexerState("idle");
      }
    },
    [vaultHandle, setIndexerState, setFileMetadata, showHiddenFiles, store],
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

  // A single gesture can reach restoreVault twice (the gate's window listener
  // and the Restore Access button); only the first opens the browser prompt.
  const isRestoringRef = useRef(false);

  const restoreVault = useCallback(async () => {
    if (!vaultHandle || isRestoringRef.current) return;
    isRestoringRef.current = true;

    try {
      const granted = await verifyPermission(vaultHandle);
      if (granted) {
        // Stay pending (route hidden and inert) until the vault is loaded, so
        // nothing is reachable before "Vault restored".
        setIsVaultUnlocking(true);
        setCurrentDirectoryHandle(vaultHandle);
        setIsCloudVault(false);
        detectCloudVault(vaultHandle);
        await scanVault(vaultHandle);
        await indexVaultTags(vaultHandle);
        await rebindHandles(vaultHandle);
        setIsVaultPending(false);
        toast.success("Vault restored");
      }
    } catch (err: any) {
      console.error("File System Error:", err?.message || err);
      toast.error("Failed to restore vault");
    } finally {
      setIsVaultUnlocking(false);
      isRestoringRef.current = false;
    }
  }, [vaultHandle, setIsVaultPending, setIsVaultUnlocking, setCurrentDirectoryHandle, setIsCloudVault, scanVault, indexVaultTags, rebindHandles, detectCloudVault]);

  const { syncCurrentDirectoryToPath, navigateTo, navigateBack } = useVaultNavigation({ vaultHandle, currentDirectoryHandle, scanVault });

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

  // Load vault on mount
  useEffect(() => {
    if (hasLoadedVault) return;
    if (!isIdbSupported) {
      setIsVaultRestoring(false);
      return;
    }

    async function restoreSavedVault() {
      const savedHandle = await loadVaultHandle();
      if (savedHandle) {
        setVaultHandle(savedHandle);
        setVaultDescriptor({ kind: "local" });
        // Only query permission on mount — requestPermission requires a user
        // gesture and will throw a SecurityError if called automatically.
        const granted = await queryPermission(savedHandle);
        if (granted) {
          // The home feed shows its own indexing state, so reveal it now.
          setIsVaultRestoring(false);
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

    async function init() {
      setHasLoadedVault(true);
      try {
        await restoreSavedVault();
      } finally {
        setIsVaultRestoring(false);
      }
    }
    init();
  }, [setIsVaultRestoring, setVaultHandle, setVaultDescriptor, setIsVaultPending, hasLoadedVault, setHasLoadedVault, setCurrentDirectoryHandle, scanVault, indexVaultTags, rebindHandles, detectCloudVault, initVaultFromHandle]);

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
