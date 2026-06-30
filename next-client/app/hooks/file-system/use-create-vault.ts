"use client";

import { useAtom, useSetAtom } from "jotai";
import { useCallback } from "react";
import { withPickerLock } from "./shared";
import { MANAGED_FILES, installVaultFiles } from "@/app/services/vault-setup";
import { installStarterPack, getStarterPack } from "@/app/services/starter-packs";
import { ensureHermesFiles } from "@/app/services/vault-schema";
import { useVaultManager } from "./use-vault-manager";
import { useOpenFile } from "./use-open-file";
import {
  atom_vaultCreationSubStep,
  atom_vaultCreationName,
  atom_vaultCreationParentHandle,
  atom_vaultCreationPackId,
  atom_vaultCreationError,
  atom_newVaultFlowOpen,
  atom_autoInjectFrontmatter,
  atom_frontmatterHasPrompted,
  type StarterPackId,
  type VaultCreationSubStep,
} from "@/app/atoms/ui-atoms";

const INVALID_NAME_CHARS = /[<>:"/\\|?*\x00-\x1F]/;

function validateVaultName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Vault name is required.";
  if (INVALID_NAME_CHARS.test(trimmed)) return 'Name cannot contain: < > : " / \\ | ? *';
  if (trimmed.startsWith(".")) return "Name cannot start with a dot.";
  if (trimmed.endsWith(" ") || trimmed.endsWith(".")) return "Name cannot end with a space or dot.";
  if (trimmed.length > 255) return "Name is too long (max 255 characters).";
  return null;
}

async function checkFolderConflict(
  parent: FileSystemDirectoryHandle,
  name: string,
): Promise<boolean> {
  try {
    await parent.getDirectoryHandle(name.trim(), { create: false });
    return true;
  } catch (err: any) {
    if (err.name === "NotFoundError") return false;
    throw err;
  }
}

export function useCreateVault() {
  const [subStep, setSubStep] = useAtom(atom_vaultCreationSubStep);
  const [vaultName, setVaultName] = useAtom(atom_vaultCreationName);
  const [parentHandle, setParentHandle] = useAtom(atom_vaultCreationParentHandle);
  const [packId, setPackId] = useAtom(atom_vaultCreationPackId);
  const [error, setError] = useAtom(atom_vaultCreationError);
  const setNewVaultFlowOpen = useSetAtom(atom_newVaultFlowOpen);
  const setAutoInjectFrontmatter = useSetAtom(atom_autoInjectFrontmatter);
  const setFrontmatterHasPrompted = useSetAtom(atom_frontmatterHasPrompted);

  const { initVaultFromHandle } = useVaultManager();
  const { openFile } = useOpenFile();

  const validateName = useCallback(
    (name: string) => validateVaultName(name),
    [],
  );

  const pickParentFolder = useCallback(async () => {
    const picked = await withPickerLock(async () => {
      try {
        return await window.showDirectoryPicker();
      } catch (err: any) {
        if (err.name === "AbortError" || err.name === "NotAllowedError") return undefined;
        throw err;
      }
    });

    if (picked) {
      setParentHandle(picked);
      setError(null);
    } else if (!parentHandle) {
      setError("No folder selected. Click 'Choose parent folder' to pick a location.");
    }
  }, [parentHandle, setParentHandle, setError]);

  const startCreationFlow = useCallback(() => {
    setSubStep("name-and-folder");
    setVaultName("");
    setParentHandle(null);
    setPackId("empty");
    setError(null);
  }, [setSubStep, setVaultName, setParentHandle, setPackId, setError]);

  const resetFlow = useCallback(() => {
    setSubStep(null);
    setVaultName("");
    setParentHandle(null);
    setPackId("empty");
    setError(null);
    setNewVaultFlowOpen(false);
  }, [setSubStep, setVaultName, setParentHandle, setPackId, setError, setNewVaultFlowOpen]);

  const goBack = useCallback(() => {
    if (subStep === "name-and-folder") {
      resetFlow();
    } else if (subStep === "starter-pack") {
      setSubStep("name-and-folder");
      setError(null);
    }
  }, [subStep, resetFlow, setSubStep, setError]);

  const advanceToPackPicker = useCallback(() => {
    const nameError = validateVaultName(vaultName);
    if (nameError) {
      setError(nameError);
      return;
    }
    if (!parentHandle) {
      setError("Choose a parent folder first.");
      return;
    }
    setError(null);
    setSubStep("starter-pack");
  }, [vaultName, parentHandle, setError, setSubStep]);

  const createVault = useCallback(async () => {
    if (!parentHandle) {
      setError("Choose a parent folder first.");
      return;
    }
    const nameError = validateVaultName(vaultName);
    if (nameError) {
      setError(nameError);
      return;
    }

    setSubStep("installing");
    setError(null);

    const currentPackId = packId;

    let newVaultHandle: FileSystemDirectoryHandle;
    try {
      const trimmedName = vaultName.trim();

      const conflict = await checkFolderConflict(parentHandle, trimmedName);
      if (conflict) {
        setError(`A folder named "${trimmedName}" already exists at that location. Choose a different name or parent folder.`);
        setSubStep("starter-pack");
        return;
      }

      newVaultHandle = await parentHandle.getDirectoryHandle(trimmedName, { create: true });
      await installVaultFiles(MANAGED_FILES, newVaultHandle, false, null, null);
      await installStarterPack(currentPackId, newVaultHandle);
      await ensureHermesFiles(newVaultHandle, true);
    } catch (err: any) {
      setError(err?.message ?? "Failed to create vault. Please try again.");
      setSubStep("starter-pack");
      return;
    }

    // Enable auto-inject by default for new vaults and mark as prompted
    // so no separate dialog interrupts the post-creation flow.
    setAutoInjectFrontmatter(true);
    setFrontmatterHasPrompted(true);
    resetFlow();

    await initVaultFromHandle(newVaultHandle, {
      isNewVault: true,
      overrideSetupStatus: "configured",
    });

    const pack = getStarterPack(currentPackId);
    if (pack.entryPoint) {
      try {
        const parts = pack.entryPoint.split("/");
        let dir: FileSystemDirectoryHandle = newVaultHandle;
        for (let i = 0; i < parts.length - 1; i++) {
          dir = await dir.getDirectoryHandle(parts[i]);
        }
        const entryHandle = await dir.getFileHandle(parts[parts.length - 1]);
        await openFile(entryHandle, pack.entryPoint, true);
      } catch {
        // Non-critical: vault is mounted, entry-point open failed
      }
    }
  }, [parentHandle, vaultName, packId, initVaultFromHandle, openFile, resetFlow, setError, setSubStep, setAutoInjectFrontmatter, setFrontmatterHasPrompted]);

  return {
    subStep,
    vaultName,
    setVaultName,
    parentHandle,
    parentFolderName: parentHandle?.name ?? null,
    packId,
    setPackId,
    error,
    setError,
    validateName,
    pickParentFolder,
    advanceToPackPicker,
    createVault,
    startCreationFlow,
    goBack,
    resetFlow,
  };
}
