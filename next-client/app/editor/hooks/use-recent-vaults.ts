"use client";

import { useCallback, useEffect, useState } from "react";
import { useAtomValue, useStore } from "jotai";
import toast from "react-hot-toast";
import { atom_pendingVaultIcon } from "@/app/atoms/ui-atoms";
import {
  atom_recentVaults,
  atom_vaultDescriptor,
  atom_vaultHandle,
  atom_vaultKey,
  type VaultDescriptor,
} from "@/app/atoms/vault-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { loadBrowserVaultRegistry, verifyPermission } from "@/app/services/idb";
import { listBrowserVaultIds } from "@/app/services/opfs";
import {
  addRecentVault,
  loadRecentVaults,
  moveRecentVault,
  removeRecentVault,
  saveRecentVaults,
  setRecentVaultIcon,
  setRecentVaultPinned,
  type RecentVault,
} from "@/app/services/recent-vaults";

// The open vault as a recents entry.
export function recentVaultEntry(
  key: string,
  handle: FileSystemDirectoryHandle,
  descriptor: VaultDescriptor | null,
  openedAt = Date.now(),
): RecentVault {
  if (descriptor?.kind === "browser") {
    return { key, kind: "browser", name: descriptor.displayName, descriptor, openedAt };
  }
  return { key, kind: "local", name: handle.name, handle, openedAt };
}

// Mounted once, by EditorShell (every /editor route): loads the recents list, then moves each
// vault that opens (or is restored) to the top of it. Follows descriptor
// changes too, so a renamed browser vault's entry keeps its new name. A vault
// just made in Create Vault takes the emoji picked there (atom_pendingVaultIcon).
export function useRecentVaultTracker() {
  const store = useStore();
  const vaultKey = useAtomValue(atom_vaultKey);
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const descriptor = useAtomValue(atom_vaultDescriptor);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isLive = true;
    void loadRecentVaults().then((list) => {
      if (!isLive) return;
      store.set(atom_recentVaults, list);
      setIsLoaded(true);
    });
    return () => { isLive = false; };
  }, [store]);

  useEffect(() => {
    if (!isLoaded || !vaultKey || !vaultHandle) return;
    const entry = recentVaultEntry(vaultKey, vaultHandle, descriptor);
    const pending = store.get(atom_pendingVaultIcon);
    if (pending?.name === entry.name) {
      entry.icon = pending.icon;
      store.set(atom_pendingVaultIcon, null);
    }
    const next = addRecentVault(store.get(atom_recentVaults), entry);
    store.set(atom_recentVaults, next);
    void saveRecentVaults(next);
  }, [isLoaded, vaultKey, vaultHandle, descriptor, store]);
}

// The recents other than the open vault, and ways to reopen, forget, pin,
// reorder or set the icon of one (each change saved at once). Forgetting only drops the entry;
// the vault's files are untouched.
export function useRecentVaults() {
  const store = useStore();
  const allRecentVaults = useAtomValue(atom_recentVaults);
  const vaultKey = useAtomValue(atom_vaultKey);
  const { initVaultFromHandle, openBrowserVault, isVaultSupported } = useFileSystem();

  const update = useCallback((change: (list: RecentVault[]) => RecentVault[]) => {
    const next = change(store.get(atom_recentVaults));
    store.set(atom_recentVaults, next);
    void saveRecentVaults(next);
  }, [store]);

  const forgetRecentVault = useCallback((key: string) => update((list) => removeRecentVault(list, key)), [update]);
  const pinRecentVault = useCallback(
    (key: string, pinned: boolean) => update((list) => setRecentVaultPinned(list, key, pinned)),
    [update],
  );
  const setIcon = useCallback(
    (key: string, icon: string | null) => update((list) => setRecentVaultIcon(list, key, icon)),
    [update],
  );
  const moveRecent = useCallback((key: string, to: number) => update((list) => moveRecentVault(list, key, to)), [update]);

  const openRecentVault = useCallback(async (entry: RecentVault): Promise<boolean> => {
    try {
      if (entry.kind === "local") {
        if (!isVaultSupported) {
          toast.error("This browser can't open folders on disk.");
          return false;
        }
        // Asks for access again if the browser has dropped it (needs this click).
        if (!(await verifyPermission(entry.handle))) {
          toast.error(`Access to "${entry.name}" wasn't granted.`);
          return false;
        }
        await initVaultFromHandle(entry.handle);
        return true;
      }
      // Opening a missing browser vault would quietly create an empty one.
      if (!(await listBrowserVaultIds()).includes(entry.descriptor.id)) {
        forgetRecentVault(entry.key);
        toast.error(`"${entry.name}" no longer exists in this browser.`);
        return false;
      }
      const registry = await loadBrowserVaultRegistry();
      return openBrowserVault(registry.find((item) => item.id === entry.descriptor.id) ?? entry.descriptor);
    } catch (err) {
      console.error("Failed to open recent vault:", err);
      toast.error(`Failed to open "${entry.name}".`);
      return false;
    }
  }, [isVaultSupported, initVaultFromHandle, openBrowserVault, forgetRecentVault]);

  return {
    recentVaults: allRecentVaults.filter((entry) => entry.key !== vaultKey),
    /** The open vault included, for editing the list. */
    allRecentVaults,
    /** The open vault's entry (its icon), once the tracker has added it. */
    openVaultEntry: allRecentVaults.find((entry) => entry.key === vaultKey) ?? null,
    openRecentVault,
    forgetRecentVault,
    pinRecentVault,
    moveRecentVault: moveRecent,
    setRecentVaultIcon: setIcon,
  };
}
