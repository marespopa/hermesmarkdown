"use client";

import { useAtom } from "jotai";
import { atom_vaultHandle, atom_currentDirectoryHandle, atom_isVaultPending, atom_isCloudVault } from "@/app/atoms/atoms";
import { useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { useFileSystem } from "./use-file-system";
import { useInterval } from "./use-interval";
import { observeVault } from "./file-system/file-observer";
import { checkVaultHealth } from "./file-system/vault-health";

const VAULT_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
const CLOUD_VAULT_SYNC_INTERVAL = 1 * 60 * 1000; // 1 minute for cloud vaults
// A burst of changes (a folder copied in, a git checkout) rescans once.
export const VAULT_WATCH_DEBOUNCE = 500;

// Keeps the vault's file list in step with the disk, without a Refresh
// button: where the browser can watch a folder (FileSystemObserver), any file
// or folder appearing, going away or moving rescans it shortly after; every
// browser also rescans when the window regains focus and on a timer.
// Each of those first checks the vault folder is still there and writable
// (checkVaultHealth), so losing it shows the RecoveryBanner instead of
// leaving later saves to fail one by one.

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
  // `wholeVault` (the folder watcher, which sees changes anywhere) rescans
  // from the vault root.
  const syncVault = useCallback(async (manual = false, wholeVault = false) => {
    if (!vaultHandle || isVaultPending) return;

    if (manual) toast.loading("Syncing vault…", { id: "vault-sync" });

    try {
      const health = await checkVaultHealth(vaultHandle);
      if (health !== "ok") {
        if (manual) toast.dismiss("vault-sync");
        return;
      }
      // Rescan whichever folder is the current directory, not just
      // the vault root — otherwise external changes inside a subfolder
      // never appear until the user navigates away and back.
      await scanVault(wholeVault ? vaultHandle : currentDirectoryHandle || vaultHandle);
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

  const syncVaultRef = useRef(syncVault);
  useEffect(() => {
    syncVaultRef.current = syncVault;
  }, [syncVault]);

  // Watch the vault folder for files added, removed or moved.
  useEffect(() => {
    if (!vaultHandle || isVaultPending) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stop: (() => void) | null = null;
    let cancelled = false;
    const resync = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void syncVaultRef.current?.(false, true), VAULT_WATCH_DEBOUNCE);
    };
    // An errored observation means the folder itself went away or became
    // unreadable; the resync's health check tells which.
    void observeVault(vaultHandle, resync, resync).then((stopWatching) => {
      if (cancelled) stopWatching?.();
      else stop = stopWatching;
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      stop?.();
    };
  }, [vaultHandle, isVaultPending]);

  // Focus-based sync
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
