"use client";

import { useCallback, useEffect } from "react";
import { useStore } from "jotai";
import toast from "react-hot-toast";
import {
  atom_content,
  atom_fileName,
  atom_liveHandles,
  atom_openFiles,
  atom_vaultHandle,
} from "@/app/atoms/atoms";
import { clearRecoveryIssue, reportRecoveryIssue, STORAGE_LOW_RATIO } from "@/app/atoms/recovery-atoms";
import { useVaultManager } from "@/app/hooks/file-system/use-vault-manager";
import { useSaveFile } from "@/app/hooks/file-system/use-save-file";
import { checkVaultHealth } from "@/app/hooks/file-system/vault-health";
import { getStorageStatus } from "@/app/services/opfs";
import { clearAllMetadataCaches } from "@/app/services/metadata-cache";
import { downloadMarkdown } from "@/app/utils/download-markdown";

// Whether browser storage is nearly full; null when the browser won't say.
export async function readStorageLow(): Promise<{ usage: number; quota: number } | null> {
  const { usage, quota } = await getStorageStatus();
  if (usage === null || !quota) return null;
  return usage / quota >= STORAGE_LOW_RATIO ? { usage, quota } : null;
}

// What RecoveryBanner's buttons do. Also warns, once on load, when browser
// storage is nearly full.
export function useRecoveryActions() {
  const store = useStore();
  const { restoreVault, openVault } = useVaultManager();
  const { saveFile } = useSaveFile();

  useEffect(() => {
    void readStorageLow().then((low) => {
      if (low) reportRecoveryIssue({ kind: "storage-low", ...low });
    });
  }, []);

  // Downloads the note in front as a .md file; nothing is written to the vault.
  const exportNote = useCallback(() => {
    const content = store.get(atom_content);
    if (!content.trim()) {
      toast("This note is empty.", { id: "recovery-export" });
      return;
    }
    const name = downloadMarkdown(content, store.get(atom_fileName));
    toast.success(`Exported ${name}`, { id: "recovery-export" });
  }, [store]);

  // Writes every open note that has unsaved changes (after access returns).
  const saveUnsavedNotes = useCallback(async () => {
    for (const [path, file] of Object.entries(store.get(atom_openFiles))) {
      if (path === "draft" || file.content === file.lastSavedContent) continue;
      const handle = store.get(atom_liveHandles(path));
      if (handle) await saveFile(file.content, handle, 0, true, path);
    }
  }, [store, saveFile]);

  // The click is the user gesture the browser's permission prompt needs.
  const regrantAccess = useCallback(async () => {
    const vault = store.get(atom_vaultHandle);
    if (!vault) return;
    await restoreVault();
    if ((await checkVaultHealth(vault)) === "ok") await saveUnsavedNotes();
  }, [store, restoreVault, saveUnsavedNotes]);

  const chooseVault = useCallback(async () => {
    if (await openVault()) clearRecoveryIssue("vault-missing", "access-lost");
  }, [openVault]);

  // Frees the one thing Hermes keeps that it can rebuild: the vault metadata
  // caches (each vault is indexed again on its next open).
  const freeUpSpace = useCallback(async () => {
    await clearAllMetadataCaches();
    const low = await readStorageLow();
    if (low) {
      reportRecoveryIssue({ kind: "storage-low", ...low });
      toast("Cache cleared, but storage is still nearly full. Export files you need.", { id: "recovery-space" });
    } else {
      clearRecoveryIssue("storage-full", "storage-low");
      toast.success("Cache cleared", { id: "recovery-space" });
    }
  }, []);

  return { exportNote, regrantAccess, chooseVault, freeUpSpace };
}
