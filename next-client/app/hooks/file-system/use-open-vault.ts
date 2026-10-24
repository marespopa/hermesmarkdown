"use client";

import { useSetAtom, useStore } from "jotai";
import { useCallback } from "react";
import toast from "react-hot-toast";
import {
  atom_vaultHandle,
  atom_currentDirectoryHandle,
  atom_vaultFiles,
  atom_vaultFolderPaths,
  atom_vaultTextFiles,
  atom_isVaultPending,
  atom_openingVaultName,
  atom_openFiles,
  atom_workspaceLayout,
  atom_rebindHandles,
  atom_isCloudVault,
  atom_vaultDescriptor,
  type VaultDescriptor,
} from "@/app/atoms/atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import {
  saveVaultHandle,
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
import { withPickerLock, isVaultSupported } from "./shared";
import { singlePaneLayout } from "./vault-scan";
import { clearNoteContent } from "@/app/services/content-search-client";
import { migrateVaultDataDir } from "@/app/services/vault-data-dir";
import { atom_browserVaultDialogOpen, atom_showFiles } from "@/app/atoms/ui-atoms";
import { purgeExpiredTrash } from "./trash-ops";

interface UseOpenVaultArgs {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: (handle?: FileSystemDirectoryHandle) => Promise<void>;
  detectCloudVault: (handle: FileSystemDirectoryHandle) => boolean;
}

// Opening a vault: from a handle (every open goes through
// initVaultFromHandle), a GitHub vault's local copy, or the folder picker.
// Part of useVaultManager, which passes in its scan and index.
export function useOpenVault({ scanVault, indexVaultTags, detectCloudVault }: UseOpenVaultArgs) {
  const setVaultHandle = useSetAtom(atom_vaultHandle);
  const setCurrentDirectoryHandle = useSetAtom(atom_currentDirectoryHandle);
  const setVaultFiles = useSetAtom(atom_vaultFiles);
  const setVaultFolderPaths = useSetAtom(atom_vaultFolderPaths);
  const setVaultTextFiles = useSetAtom(atom_vaultTextFiles);
  const setIsVaultPending = useSetAtom(atom_isVaultPending);
  const setOpeningVaultName = useSetAtom(atom_openingVaultName);
  const setFileMetadata = useSetAtom(atom_fileMetadata);
  const setOpenFiles = useSetAtom(atom_openFiles);
  const setWorkspaceLayout = useSetAtom(atom_workspaceLayout);
  const setIsCloudVault = useSetAtom(atom_isCloudVault);
  const setVaultDescriptor = useSetAtom(atom_vaultDescriptor);
  const rebindHandles = useSetAtom(atom_rebindHandles);
  const setBrowserVaultDialogOpen = useSetAtom(atom_browserVaultDialogOpen);
  const store = useStore();

  const initVaultFromHandle = useCallback(async (
    handle: FileSystemDirectoryHandle,
    options?: {
      isNewVault?: boolean;
      descriptor?: VaultDescriptor;
      persist?: boolean;
      announce?: boolean;
      // Reopening the saved vault on page load: its tabs (persisted with the
      // workspace layout) stay open instead of starting from an empty pane.
      keepTabs?: boolean;
      // Once the open notes are bound and the top folder listed (pre-index).
      onReadable?: () => void;
    }
  ) => {
    const {
      isNewVault = false,
      descriptor = { kind: "local" },
      persist = true,
      announce = true,
      keepTabs = false,
      onReadable,
    } = options ?? {};
    const vaultName = descriptor.kind === "local" ? handle.name : descriptor.displayName;

    // A vault the user opens shows "Opening …" until it's readable; the
    // startup restore (not announced) has the editor skeleton instead.
    if (announce) setOpeningVaultName(vaultName);
    try {
      setFileMetadata({});
      setVaultFiles([]);
      setVaultFolderPaths([]);
      setVaultTextFiles([]);
      if (!keepTabs) {
        clearNoteContent();
        setOpenFiles({});
        setWorkspaceLayout(singlePaneLayout([], null));
      }
      // Before anything reads the vault's data folder (pins, the Trash).
      await migrateVaultDataDir(handle);
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
      // The open notes first (a few files, read again from disk), then the top
      // folder; the whole vault is indexed last, behind the editor.
      await rebindHandles(handle);
      await scanVault(handle);
      // A vault the user opens starts on its files: the sidebar shown with
      // Files unfolded and the tree focused.
      if (announce) store.set(atom_showFiles);
    } finally {
      if (announce) setOpeningVaultName(null);
    }
    onReadable?.();
    await indexVaultTags(handle);
    void purgeExpiredTrash(handle);

    if (announce) {
      toast.success(isNewVault ? `Vault created: ${vaultName}` : `Vault opened: ${vaultName}`);
    }
  }, [setOpeningVaultName, setVaultHandle, setVaultDescriptor, setCurrentDirectoryHandle, setIsVaultPending, setFileMetadata, setVaultFiles, setVaultFolderPaths, setVaultTextFiles, setOpenFiles, setWorkspaceLayout, setIsCloudVault, scanVault, indexVaultTags, rebindHandles, detectCloudVault, store]);

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

  return { initVaultFromHandle, initGitHubVault, openVault };
}
