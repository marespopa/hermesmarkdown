"use client";

import { useEffect, useState } from "react";
import { useVaultManager } from "./file-system/use-vault-manager";
import { useFileEditor } from "./file-system/use-file-editor";
import { useFileCrud } from "./file-system/use-file-crud";
import { isVaultSupported, isIdbSupported } from "./file-system/shared";
import { useAtomValue } from "jotai";
import { atom_vaultFiles } from "../atoms/atoms";

/**
 * useFileSystem Facade Hook
 * 
 * Aggregates vault management, file editing, and file CRUD operations
 * into a single interface for backward compatibility.
 */
export function useFileSystem() {
  const [mounted, setMounted] = useState(false);
  const vaultFiles = useAtomValue(atom_vaultFiles);

  useEffect(() => {
    setMounted(true);
  }, []);

  const vaultManager = useVaultManager();
  
  const fileEditor = useFileEditor({ 
    indexVaultTags: vaultManager.indexVaultTags 
  });
  
  const fileCrud = useFileCrud({
    scanVault: vaultManager.scanVault,
    indexVaultTags: vaultManager.indexVaultTags,
    openFile: fileEditor.openFile,
  });

  return {
    ...vaultManager,
    ...fileEditor,
    ...fileCrud,
    vaultFiles,
    isVaultSupported: isVaultSupported && mounted,
    isIdbSupported: isIdbSupported && mounted,
    isMounted: mounted,
  };
}
