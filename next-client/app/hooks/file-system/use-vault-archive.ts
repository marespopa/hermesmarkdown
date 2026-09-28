"use client";

import { useAtom } from "jotai";
import { useCallback } from "react";
import toast from "react-hot-toast";
import { atom_vaultDescriptor, atom_vaultHandle } from "@/app/atoms/atoms";
import { markBrowserVaultExported } from "@/app/services/idb";
import {
  copyVaultToDirectory,
  createVaultZip,
  downloadBlob,
  pickFiles,
  readImportSelection,
  supportsDirectoryInput,
  writeArchiveFiles,
} from "@/app/services/vault-archive";
import { isVaultSupported, withPickerLock } from "./shared";

interface UseVaultArchiveProps {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: (passedHandle?: FileSystemDirectoryHandle) => Promise<void>;
}

export type ImportSource = "files" | "folder";

// Whole-vault backup and restore for every vault kind. For browser vaults a
// successful export also records the backup time used by the reminder.
export function useVaultArchive({ scanVault, indexVaultTags }: UseVaultArchiveProps) {
  const [vaultHandle] = useAtom(atom_vaultHandle);
  const [vaultDescriptor, setVaultDescriptor] = useAtom(atom_vaultDescriptor);

  const vaultName = vaultDescriptor && vaultDescriptor.kind !== "local"
    ? vaultDescriptor.displayName
    : vaultHandle?.name ?? "vault";

  const recordExport = useCallback(async () => {
    if (vaultDescriptor?.kind !== "browser") return;
    const updated = await markBrowserVaultExported(vaultDescriptor.id);
    if (updated) setVaultDescriptor(updated);
  }, [vaultDescriptor, setVaultDescriptor]);

  const exportVaultZip = useCallback(async (): Promise<boolean> => {
    if (!vaultHandle) return false;
    const toastId = toast.loading("Packing vault…");
    try {
      const blob = await createVaultZip(vaultHandle);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `${vaultName.replace(/[\\/:*?"<>|]/g, "-")}-${stamp}.zip`);
      await recordExport();
      toast.success("Vault export started", { id: toastId });
      return true;
    } catch (err) {
      console.error("Vault export failed:", err);
      toast.error("Failed to export the vault.", { id: toastId });
      return false;
    }
  }, [vaultHandle, vaultName, recordExport]);

  // Chromium only: copy the vault into a folder on disk (for example to turn a
  // browser vault into a disk vault).
  const exportVaultToFolder = useCallback(async (): Promise<boolean> => {
    if (!vaultHandle || !isVaultSupported) return false;
    const parent = await withPickerLock(async () => {
      try {
        return await window.showDirectoryPicker({ mode: "readwrite" });
      } catch (err: any) {
        if (err.name === "AbortError" || err.name === "NotAllowedError") return undefined;
        throw err;
      }
    });
    if (!parent) return false;

    const toastId = toast.loading("Copying vault…");
    try {
      const { folder, files } = await copyVaultToDirectory(vaultHandle, parent, vaultName);
      await recordExport();
      toast.success(`Copied ${files} file(s) to ${parent.name}/${folder}`, { id: toastId });
      return true;
    } catch (err) {
      console.error("Vault copy failed:", err);
      toast.error("Failed to copy the vault.", { id: toastId });
      return false;
    }
  }, [vaultHandle, vaultName, recordExport]);

  // "folder" picks a whole folder where the browser allows it; "files" takes
  // .zip archives and loose notes/attachments (the only option on iOS).
  const importIntoVault = useCallback(async (source: ImportSource = "files"): Promise<boolean> => {
    if (!vaultHandle) return false;
    const selection = source === "folder" && supportsDirectoryInput()
      ? await pickFiles({ directory: true, multiple: true })
      : await pickFiles({ multiple: true, accept: ".zip,.md,.markdown,.txt,image/*,application/pdf" });
    if (selection.length === 0) return false;

    const toastId = toast.loading("Importing…");
    try {
      const files = await readImportSelection(selection);
      if (files.length === 0) {
        toast.error("Nothing to import.", { id: toastId });
        return false;
      }
      const { imported, renamed } = await writeArchiveFiles(vaultHandle, files);
      await scanVault(vaultHandle);
      await indexVaultTags();
      toast.success(
        renamed > 0
          ? `Imported ${imported} file(s); ${renamed} renamed to avoid overwriting.`
          : `Imported ${imported} file(s).`,
        { id: toastId },
      );
      return true;
    } catch (err) {
      console.error("Vault import failed:", err);
      toast.error("Failed to import into the vault.", { id: toastId });
      return false;
    }
  }, [vaultHandle, scanVault, indexVaultTags]);

  return { exportVaultZip, exportVaultToFolder, importIntoVault };
}
