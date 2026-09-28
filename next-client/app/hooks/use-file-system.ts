"use client";

import { useEffect, useState } from "react";
import { useVaultManager } from "./file-system/use-vault-manager";
import { useFileEditor } from "./file-system/use-file-editor";
import { useFileCrud } from "./file-system/use-file-crud";
import { useBrowserVault } from "./file-system/use-browser-vault";
import { useVaultArchive } from "./file-system/use-vault-archive";
import { isVaultSupported, isIdbSupported, isBrowserVaultSupported } from "./file-system/shared";
import { useAtomValue } from "jotai";
import { atom_vaultFiles } from "../atoms/atoms";

/**
 * useFileSystem Facade Hook
 *
 * Aggregates vault management, browser vaults, vault export/import, file
 * editing, and file CRUD operations.
 */
export function useFileSystem() {
  const [mounted, setMounted] = useState(false);
  const vaultFiles = useAtomValue(atom_vaultFiles);

  useEffect(() => {
    setMounted(true);
  }, []);

  const vaultManager = useVaultManager();
  const fileEditor = useFileEditor();
  const fileCrud = useFileCrud({
    scanVault: vaultManager.scanVault,
    indexVaultTags: vaultManager.indexVaultTags,
    openFile: fileEditor.openFile,
  });
  const browserVault = useBrowserVault({
    initVaultFromHandle: vaultManager.initVaultFromHandle,
    closeVault: vaultManager.closeVault,
  });
  const vaultArchive = useVaultArchive({
    scanVault: vaultManager.scanVault,
    indexVaultTags: vaultManager.indexVaultTags,
  });

  return {
    ...vaultManager,
    ...fileEditor,
    ...fileCrud,
    ...browserVault,
    ...vaultArchive,
    vaultFiles,
    isVaultSupported: isVaultSupported && mounted,
    isIdbSupported: isIdbSupported && mounted,
    isBrowserVaultSupported: isBrowserVaultSupported && mounted,
    isMounted: mounted,
  };
}
