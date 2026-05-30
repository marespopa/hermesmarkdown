"use client";

import { useAtom } from "jotai";
import { atom_vaultHandle, atom_isVaultPending } from "@/app/atoms/atoms";
import { useEffect, useCallback, useRef } from "react";
import { useFileSystem } from "./use-file-system";
import { useInterval } from "./use-interval";

const VAULT_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useVaultSync() {
  const [vaultHandle] = useAtom(atom_vaultHandle);
  const [isVaultPending] = useAtom(atom_isVaultPending);
  const { scanVault, indexVaultTags } = useFileSystem();

  const syncVault = useCallback(async () => {
    if (!vaultHandle || isVaultPending) return;

    try {
      await scanVault(vaultHandle);
      await indexVaultTags(vaultHandle);
      console.log("Vault structure synced");
    } catch (err: any) {
      console.warn("Vault sync failed:", err?.message || err);
    }
  }, [vaultHandle, isVaultPending, scanVault, indexVaultTags]);

  // Periodic sync
  useInterval(syncVault, VAULT_SYNC_INTERVAL);

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
}
