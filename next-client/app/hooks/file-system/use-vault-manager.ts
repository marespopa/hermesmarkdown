"use client";

import { useAtom, useSetAtom, useStore } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
  atom_vaultHandle,
  atom_currentDirectoryHandle,
  atom_vaultFiles,
  atom_vaultFolderPaths,
  atom_vaultTextFiles,
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
} from "@/app/atoms/atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import {
  loadVaultHandle,
  clearVaultHandle,
  verifyPermission,
  queryPermission,
} from "@/app/services/idb";
import { metadataWorker, isIdbSupported } from "./shared";
import {
  collectVaultFiles,
  isCloudFolderName,
  listDirectoryEntries,
  metadataForFiles,
  singlePaneLayout,
} from "./vault-scan";
import { reportCollectProblems } from "./vault-index";
import { runVaultIndex } from "./run-vault-index";
import { markVaultTreeListed } from "./tree-listed";
import { useVaultNavigation } from "./use-vault-navigation";
import { useOpenVault } from "./use-open-vault";
import { clearNoteContent } from "@/app/services/content-search-client";
import { atom_showHiddenFiles } from "@/app/atoms/ui-atoms";
import { loadStoredWorkspace } from "./stored-workspace";
import { migrateLegacyGitHubVaults } from "@/app/services/legacy-github-vaults";
import { readVaultHint, writeVaultHint } from "@/app/services/vault-hint";

// Each scan and each indexing run takes a number; an older one drops its
// results once a newer one starts, or once another vault is open. Module
// level, not per hook: useFileSystem (and so this hook) runs in many
// components, and a run started in one must stop when another opens a vault.
let scanRun = 0;
let indexRun = 0;

export function useVaultManager() {
  const [vaultHandle, setVaultHandle] = useAtom(atom_vaultHandle);
  const [currentDirectoryHandle, setCurrentDirectoryHandle] = useAtom(atom_currentDirectoryHandle);
  const [, setVaultFiles] = useAtom(atom_vaultFiles);
  const setVaultFolderPaths = useSetAtom(atom_vaultFolderPaths);
  const setVaultTextFiles = useSetAtom(atom_vaultTextFiles);
  const [isVaultPending, setIsVaultPending] = useAtom(atom_isVaultPending);
  const [hasLoadedVault, setHasLoadedVault] = useAtom(atom_hasLoadedVault);
  const setIsVaultRestoring = useSetAtom(atom_isVaultRestoring);
  const setIsVaultUnlocking = useSetAtom(atom_isVaultUnlocking);
  const [, setFileMetadata] = useAtom(atom_fileMetadata);
  const [, setActiveFileHandle] = useAtom(atom_activeFileHandle);
  const [, setActiveFilePath] = useAtom(atom_activeFilePath);
  const setOpenFiles = useSetAtom(atom_openFiles);
  const [, setWorkspaceLayout] = useAtom(atom_workspaceLayout);
  const [, setIsCloudVault] = useAtom(atom_isCloudVault);
  const [, setVaultDescriptor] = useAtom(atom_vaultDescriptor);
  const [, setFileSystemVersion] = useAtom(atom_fileSystemVersion);
  const [showHiddenFiles] = useAtom(atom_showHiddenFiles);
  const rebindHandles = useSetAtom(atom_rebindHandles);
  const setIndexerState = useSetAtom(atom_indexerState);
  const store = useStore();

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
      const run = ++scanRun;
      // The store, not this closure: right after a vault opens, it's stale.
      const vault = store.get(atom_vaultHandle);
      try {
        setFileSystemVersion((v) => v + 1);
        const entries = await listDirectoryEntries(vault, handle, includeHidden);
        if (run !== scanRun || store.get(atom_vaultHandle) !== vault) return;
        setVaultFiles(entries);
      } catch (err: any) {
        console.warn("Failed to scan vault:", err);
      }
    },
    [setVaultFiles, store, setFileSystemVersion, showHiddenFiles],
  );

  const indexVaultTags = useCallback(
    async (passedHandle?: FileSystemDirectoryHandle, showHiddenOverride?: boolean) => {
      const includeHidden = showHiddenOverride ?? showHiddenFiles;
      try {
        // The store, not this closure: a sync that started just before
        // another vault opened would otherwise index the old one.
        const handle = passedHandle || store.get(atom_vaultHandle);
        if (!handle) return;

        const run = ++indexRun;
        const vault = store.get(atom_vaultHandle);
        const isCurrent = () => indexRun === run && store.get(atom_vaultHandle) === vault;
        setIndexerState({ status: "compiling", count: 0 });

        // Without a worker, list the notes with no parsed metadata once the
        // walk is over. Fresh vault open replaces metadata entirely; re-index
        // keeps earlier parses, refreshes handles and drops files gone from disk.
        if (!metadataWorker) {
          const { files: fileHandles, folders, textFiles, failedSubdirs, timedOut } = await collectVaultFiles(handle, includeHidden);
          reportCollectProblems(timedOut, failedSubdirs);
          if (!isCurrent()) return;
          setVaultFolderPaths(folders);
          setVaultTextFiles(textFiles);
          setFileMetadata((prev) => metadataForFiles(fileHandles, passedHandle ? undefined : prev));
          setIndexerState("idle");
          markVaultTreeListed(store, store.get(atom_vaultKey));
          return;
        }

        // Streams notes in as folders are listed (run-vault-index.ts). Read
        // the vault key from the store: right after a vault opens, this
        // callback's closure is stale.
        const indexing = await runVaultIndex({
          worker: metadataWorker,
          root: handle,
          includeHidden,
          fresh: !!passedHandle,
          vaultKey: store.get(atom_vaultKey),
          setMetadata: setFileMetadata,
          setFolderPaths: setVaultFolderPaths,
          setTextFiles: setVaultTextFiles,
          isCurrent,
        });
        if (!indexing) return;
        markVaultTreeListed(store, store.get(atom_vaultKey));
        const { done, contentDone } = indexing;
        void contentDone.catch((err) => console.error("Failed to index note text:", err));
        void done
          .catch((err) => console.error("Failed to parse vault metadata:", err))
          .finally(() => {
            if (isCurrent()) setIndexerState("idle");
          });
      } catch (err: any) {
        console.error("Failed to index vault tags:", err);
        setIndexerState("idle");
      }
    },
    [setIndexerState, setFileMetadata, setVaultFolderPaths, setVaultTextFiles, showHiddenFiles, store],
  );

  const { initVaultFromHandle, openVault } = useOpenVault({ scanVault, indexVaultTags, detectCloudVault });

  // A single gesture can reach restoreVault twice (the gate's window listener
  // and the Restore Access button); only the first opens the browser prompt.
  const isRestoringRef = useRef(false);

  const restoreVault = useCallback(async () => {
    if (!vaultHandle || isRestoringRef.current) return;
    isRestoringRef.current = true;

    try {
      const granted = await verifyPermission(vaultHandle);
      if (granted) {
        // Pending (route hidden, inert) until the open notes are bound and the
        // top folder listed; the vault is then indexed behind the editor.
        setIsVaultUnlocking(true);
        setCurrentDirectoryHandle(vaultHandle);
        setIsCloudVault(false);
        detectCloudVault(vaultHandle);
        await rebindHandles(vaultHandle);
        await scanVault(vaultHandle);
        setIsVaultPending(false);
        setIsVaultUnlocking(false);
        toast.success("Vault restored");
        await indexVaultTags(vaultHandle);
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
    setVaultFolderPaths([]);
    setVaultTextFiles([]);
    setFileMetadata({});
    clearNoteContent();
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
  }, [setVaultHandle, setCurrentDirectoryHandle, setVaultFiles, setVaultFolderPaths, setVaultTextFiles, setFileMetadata, setActiveFileHandle, setActiveFilePath, setIsVaultPending, setOpenFiles, setWorkspaceLayout, setIsCloudVault, setVaultDescriptor]);

  // Load vault on mount
  useEffect(() => {
    if (hasLoadedVault) return;
    if (!isIdbSupported) {
      setIsVaultRestoring(false);
      return;
    }

    // Restores the saved vault, resolving whether there was one to restore.
    async function restoreSavedVault(): Promise<boolean> {
      // Once: GitHub vaults left from before their removal become browser
      // vaults (that touches browser storage only, so the saved folder is
      // looked up alongside).
      const [, savedHandle] = await Promise.all([migrateLegacyGitHubVaults(), loadVaultHandle()]);
      if (savedHandle) {
        setVaultHandle(savedHandle);
        setVaultDescriptor({ kind: "local" });
        // Only query permission on mount — requestPermission requires a user
        // gesture and will throw a SecurityError if called automatically.
        const granted = await queryPermission(savedHandle);
        if (granted) {
          // The editor can show while the vault is read, so reveal it now.
          setIsVaultRestoring(false);
          setCurrentDirectoryHandle(savedHandle);
          detectCloudVault(savedHandle);
          // Open notes first: their disk text and saving don't wait for the index.
          await rebindHandles(savedHandle);
          await scanVault(savedHandle);
          await indexVaultTags(savedHandle);
        } else {
          setIsVaultPending(true);
        }
        return true;
      }

      // Browser-storage vaults need no permission prompt.
      try {
        const stored = await loadStoredWorkspace();
        if (stored) {
          await initVaultFromHandle(stored.handle, {
            descriptor: stored.descriptor,
            persist: false,
            announce: false,
            keepTabs: true,
            onReadable: () => setIsVaultRestoring(false),
          });
          return true;
        }
      } catch (err) {
        console.error("Failed to restore vault from browser storage:", err);
        toast.error("Failed to restore the vault from browser storage.");
      }
      return false;
    }

    async function init() {
      setHasLoadedVault(true);
      // Optimistic: no vault last time, so the editor shows now (the draft)
      // while the restore checks behind it.
      if (readVaultHint() === "none") setIsVaultRestoring(false);
      try {
        writeVaultHint((await restoreSavedVault()) ? "saved" : "none");
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
    openVault,
    restoreVault,
    closeVault,
    navigateTo,
    navigateBack,
    syncCurrentDirectoryToPath,
  };
}
