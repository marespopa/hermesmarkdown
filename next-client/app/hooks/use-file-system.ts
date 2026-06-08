"use client";

import { useEffect, useState } from "react";
import { useVaultManager } from "./file-system/use-vault-manager";
import { useFileEditor } from "./file-system/use-file-editor";
import { useFileCrud } from "./file-system/use-file-crud";
import { isVaultSupported, isIdbSupported } from "./file-system/shared";
import { useAtomValue } from "jotai";
import { atom_vaultFiles } from "../atoms/atoms";
import { atom_isDriveVault } from "../atoms/drive-atoms";
import { useDriveVaultManager } from "./drive/use-drive-vault-manager";
import { useDriveFileEditor } from "./drive/use-drive-file-editor";
import { useDriveFileCrud } from "./drive/use-drive-file-crud";
import { useDriveAuth } from "./drive/use-drive-auth";

/**
 * useFileSystem Facade Hook
 *
 * Aggregates vault management, file editing, and file CRUD operations.
 * Dispatches to either local File System API hooks or Google Drive hooks
 * based on atom_isDriveVault.
 */
export function useFileSystem() {
  const [mounted, setMounted] = useState(false);
  const vaultFiles = useAtomValue(atom_vaultFiles);
  const isDriveVault = useAtomValue(atom_isDriveVault);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Always call all hooks (Rules of Hooks — no conditional calls)
  const localVaultManager = useVaultManager();
  const driveVaultManager = useDriveVaultManager();
  const { authState, signIn, signOut } = useDriveAuth();

  const localFileEditor = useFileEditor();
  const driveFileEditor = useDriveFileEditor();

  const localFileCrud = useFileCrud({
    scanVault: localVaultManager.scanVault,
    indexVaultTags: localVaultManager.indexVaultTags,
    openFile: localFileEditor.openFile,
  });
  const driveFileCrud = useDriveFileCrud({
    scanVault: driveVaultManager.scanVault,
    indexVaultTags: driveVaultManager.indexVaultTags,
    openFile: driveFileEditor.openFile,
  });

  const vaultManager = isDriveVault ? driveVaultManager : localVaultManager;
  const fileEditor = isDriveVault ? driveFileEditor : localFileEditor;
  const fileCrud = isDriveVault ? driveFileCrud : localFileCrud;

  return {
    ...vaultManager,
    ...fileEditor,
    ...fileCrud,
    vaultFiles,
    isVaultSupported: isVaultSupported && mounted,
    isIdbSupported: isIdbSupported && mounted,
    isMounted: mounted,
    isDriveVault,
    // Drive-specific extras
    openDriveVault: driveVaultManager.openDriveVault,        // (folderId, folderName) — called by picker
    openDriveVaultPicker: driveVaultManager.openVault,       // shows the folder picker modal
    driveAuthState: authState,
    driveSignIn: signIn,
    driveSignOut: signOut,
  };
}
