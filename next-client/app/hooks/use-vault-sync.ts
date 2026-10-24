"use client";

import { useAtom, useStore } from "jotai";
import { atom_vaultHandle, atom_currentDirectoryHandle, atom_isVaultPending, atom_isCloudVault } from "@/app/atoms/atoms";
import { useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { useFileSystem } from "./use-file-system";
import { useInterval } from "./use-interval";
import { observeVault } from "./file-system/file-observer";
import { checkVaultHealth } from "./file-system/vault-health";
import { isVaultSyncHeld } from "./file-system/vault-sync-hold";

const VAULT_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
const CLOUD_VAULT_SYNC_INTERVAL = 1 * 60 * 1000; // 1 minute for cloud vaults
// A burst of changes (a folder copied in, a git checkout) rescans once.
export const VAULT_WATCH_DEBOUNCE = 500;
// Switching back to the window (often, on a phone) syncs at most this often.
export const FOCUS_SYNC_MIN_GAP = 30 * 1000;

// Keeps the vault's file list in step with the disk, without a Refresh
// button: where the browser can watch a folder (FileSystemObserver), any file
// or folder appearing, going away or moving rescans it shortly after; every
// browser also rescans when the window regains focus and on a timer.
// Each of those first checks the vault folder is still there and writable
// (checkVaultHealth), so losing it shows the RecoveryBanner instead of
// leaving later saves to fail one by one.
// A background sync never runs alongside another, nor while the app's own
// file operations are changing the vault (vault-sync-hold.ts): those rescan
// when they're done, and a sync in their middle slowed them and raced them.

export function useVaultSync() {
  const store = useStore();
  const [vaultHandle] = useAtom(atom_vaultHandle);
  const [isVaultPending, setIsVaultPending] = useAtom(atom_isVaultPending);
  const [isCloudVault] = useAtom(atom_isCloudVault);
  const { scanVault, indexVaultTags } = useFileSystem();

  // `manual` distinguishes an explicit user-triggered sync (Refresh button)
  // from the silent periodic/focus background re-scan. Background syncs stay
  // silent on success — only manual syncs get a start/complete toast. Both
  // toast on failure, since a silently-failing sync was the actual problem.
  // `wholeVault` (the folder watcher, which sees changes anywhere) rescans
  // from the vault root.
  // The vault and folder are read from the store when the sync runs, not
  // from this render: the window regains focus as the folder picker closes,
  // while another vault is opening, and a sync of the old one would replace
  // the new vault's list and index.
  const runningRef = useRef(false);
  const lastSyncRef = useRef(0);
  const syncVault = useCallback(async (manual = false, wholeVault = false) => {
    const vaultHandle = store.get(atom_vaultHandle);
    const currentDirectoryHandle = store.get(atom_currentDirectoryHandle);
    if (!vaultHandle || isVaultPending) return;
    if (!manual && (runningRef.current || isVaultSyncHeld())) return;

    if (manual) toast.loading("Syncing vault…", { id: "vault-sync" });

    runningRef.current = true;
    try {
      const health = await checkVaultHealth(vaultHandle);
      if (health !== "ok" || store.get(atom_vaultHandle) !== vaultHandle) {
        if (manual) toast.dismiss("vault-sync");
        return;
      }
      // Rescan whichever folder is the current directory, not just
      // the vault root — otherwise external changes inside a subfolder
      // never appear until the user navigates away and back.
      await scanVault(wholeVault ? vaultHandle : currentDirectoryHandle || vaultHandle);
      if (store.get(atom_vaultHandle) !== vaultHandle) return;
      await indexVaultTags();
      if (manual) toast.success("Vault synced", { id: "vault-sync" });
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setIsVaultPending(true);
        toast.error("Vault access lost — reopen the vault to restore it.", { id: "vault-sync" });
      } else {
        toast.error(`Vault sync failed: ${err?.message || err}`, { id: "vault-sync" });
      }
    } finally {
      runningRef.current = false;
      lastSyncRef.current = Date.now();
    }
  }, [store, isVaultPending, scanVault, indexVaultTags, setIsVaultPending]);

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
      if (Date.now() - lastSyncRef.current < FOCUS_SYNC_MIN_GAP) return;
      syncVaultRef.current?.();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [vaultHandle]);

  return { syncVault };
}
