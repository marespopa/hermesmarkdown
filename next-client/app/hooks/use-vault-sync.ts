"use client";

import { useAtom } from "jotai";
import { atom_vaultHandle, atom_isVaultPending, atom_isCloudVault } from "@/app/atoms/atoms";
import { useEffect, useCallback, useRef } from "react";
import { useFileSystem } from "./use-file-system";
import { useInterval } from "./use-interval";

const VAULT_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
const CLOUD_VAULT_SYNC_INTERVAL = 1 * 60 * 1000; // 1 minute for cloud vaults

export function useVaultSync() {
  const [vaultHandle] = useAtom(atom_vaultHandle);
  const [isVaultPending, setIsVaultPending] = useAtom(atom_isVaultPending);
  const [isCloudVault] = useAtom(atom_isCloudVault);
  const { scanVault, indexVaultTags } = useFileSystem();

  const syncVault = useCallback(async () => {
    if (!vaultHandle || isVaultPending) return;

    try {
      await scanVault(vaultHandle);
      await indexVaultTags();
      console.log("Vault structure synced");
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        console.warn("Vault access lost, setting to pending state.");
        setIsVaultPending(true);
      } else {
        console.warn("Vault sync failed:", err?.message || err);
      }
    }
  }, [vaultHandle, isVaultPending, scanVault, indexVaultTags, setIsVaultPending]);

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
