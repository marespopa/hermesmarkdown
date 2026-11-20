"use client";

import { useAtom, useSetAtom, useStore } from "jotai";
import { useCallback, useEffect } from "react";
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
  atom_activeFileHandle,
  atom_activeFilePath,
  atom_openFiles,
  atom_workspaceLayout,
  atom_isCloudVault,
  atom_fileSystemVersion,
  atom_indexerState,
  atom_vaultDescriptor,
  atom_vaultKey,
} from "@/app/atoms/atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { clearVaultHandle } from "@/app/services/idb";
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
import { useVaultRestore } from "./use-vault-restore";
import { readVaultHint, writeVaultHint } from "@/app/services/vault-hint";
import { showActionToast } from "@/app/components/Toastr";
import { markStartup } from "@/app/utils/startup-trace";

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
  const [, setFileMetadata] = useAtom(atom_fileMetadata);
  const [, setActiveFileHandle] = useAtom(atom_activeFileHandle);
  const [, setActiveFilePath] = useAtom(atom_activeFilePath);
  const setOpenFiles = useSetAtom(atom_openFiles);
  const [, setWorkspaceLayout] = useAtom(atom_workspaceLayout);
  const [, setIsCloudVault] = useAtom(atom_isCloudVault);
  const [, setVaultDescriptor] = useAtom(atom_vaultDescriptor);
  const [, setFileSystemVersion] = useAtom(atom_fileSystemVersion);
  const [showHiddenFiles] = useAtom(atom_showHiddenFiles);
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
        void contentDone.catch((err) => console.error("Failed to index file text:", err));
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

  const { restoreVault, restoreSavedVault } = useVaultRestore({ vaultHandle, scanVault, indexVaultTags, detectCloudVault, initVaultFromHandle });

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
  }, [setVaultHandle, setCurrentDirectoryHandle, setVaultFiles, setVaultFolderPaths, setVaultTextFiles, setFileMetadata, setActiveFileHandle, setActiveFilePath, setIsVaultPending, setOpenFiles, setWorkspaceLayout, setIsCloudVault, setVaultDescriptor]);

  // Load vault on mount
  useEffect(() => {
    if (hasLoadedVault) return;
    if (!isIdbSupported) {
      setIsVaultRestoring(false);
      return;
    }

    async function init() {
      setHasLoadedVault(true);
      // Optimistic: no vault last time, so the editor shows now (the draft)
      // while the restore checks behind it.
      if (readVaultHint() === "none") setIsVaultRestoring(false);
      try {
        writeVaultHint((await restoreSavedVault()) ? "saved" : "none");
      } catch (err) {
        // Browser storage didn't answer in time. That says nothing about
        // whether a vault was saved, so the hint stays as it was; a reload retries.
        console.error("Failed to restore the saved vault:", err);
        showActionToast("Couldn't open your vault.", "Reload", () => window.location.reload());
      } finally {
        markStartup("vault:restore-done");
        setIsVaultRestoring(false);
      }
    }
    init();
  }, [setIsVaultRestoring, hasLoadedVault, setHasLoadedVault, restoreSavedVault]);

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
