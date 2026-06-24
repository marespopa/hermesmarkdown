"use client";

import { useAtom } from "jotai";
import { atom_vaultHandle, atom_currentDirectoryHandle, atom_isVaultPending, atom_isCloudVault } from "@/app/atoms/atoms";
import { useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { useFileSystem } from "./use-file-system";
import { useInterval } from "./use-interval";

const VAULT_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
const CLOUD_VAULT_SYNC_INTERVAL = 1 * 60 * 1000; // 1 minute for cloud vaults

export function useVaultSync() {
  const [vaultHandle] = useAtom(atom_vaultHandle);
  const [currentDirectoryHandle] = useAtom(atom_currentDirectoryHandle);
  const [isVaultPending, setIsVaultPending] = useAtom(atom_isVaultPending);
  const [isCloudVault] = useAtom(atom_isCloudVault);
  const { scanVault, indexVaultTags } = useFileSystem();

  // `manual` distinguishes an explicit user-triggered sync (Refresh button)
  // from the silent periodic/focus background re-scan. Background syncs stay
  // silent on success — only manual syncs get a start/complete toast. Both
  // toast on failure, since a silently-failing sync was the actual problem.
  const syncVault = useCallback(async (manual = false) => {
    if (!vaultHandle || isVaultPending) return;

    if (manual) toast.loading("Syncing vault…", { id: "vault-sync" });

    try {
      // Rescan whichever folder is currently shown in the sidebar, not just
      // the vault root — otherwise external changes inside a subfolder
      // never appear until the user navigates away and back.
      await scanVault(currentDirectoryHandle || vaultHandle);
      await indexVaultTags();
      if (manual) toast.success("Vault synced", { id: "vault-sync" });
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setIsVaultPending(true);
        toast.error("Vault access lost — reopen the vault to restore it.", { id: "vault-sync" });
      } else {
        toast.error(`Vault sync failed: ${err?.message || err}`, { id: "vault-sync" });
      }
    }
  }, [vaultHandle, currentDirectoryHandle, isVaultPending, scanVault, indexVaultTags, setIsVaultPending]);

  // Periodic sync
  useInterval(syncVault, isCloudVault ? CLOUD_VAULT_SYNC_INTERVAL : VAULT_SYNC_INTERVAL);

  // Focus-based sync
  const syncVaultRef = useRef(syncVault);
  useEffect(() => {
    syncVaultRef.current = syncVault;
  }, [syncVault]);

  useEffect(() => {
    if (!vaultHandle) return;

    const handleFocus = () => {
      syncVaultRef.current?.();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [vaultHandle]);

  return { syncVault };
}
