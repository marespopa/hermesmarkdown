"use client";

import { useAtom } from "jotai";
import { useCallback } from "react";
import { atom_currentDirectoryHandle, atom_isVaultPending } from "@/app/atoms/atoms";
import { isSameDirectory, resolveParentDirectory } from "./vault-scan";

interface VaultNavigationDeps {
  vaultHandle: FileSystemDirectoryHandle | null;
  currentDirectoryHandle: FileSystemDirectoryHandle | null;
  scanVault: (handle: FileSystemDirectoryHandle, showHiddenOverride?: boolean) => Promise<void>;
}

// Moves the file views' current folder: follow a note's parent folder, step
// into a folder, or go back to the vault root. Used by useVaultManager.
export function useVaultNavigation({ vaultHandle, currentDirectoryHandle, scanVault }: VaultNavigationDeps) {
  // useAtom (not useSetAtom), as in useVaultManager, whose tests mock it.
  const [, setCurrentDirectoryHandle] = useAtom(atom_currentDirectoryHandle);
  const [, setIsVaultPending] = useAtom(atom_isVaultPending);

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

  return { syncCurrentDirectoryToPath, navigateTo, navigateBack };
}
