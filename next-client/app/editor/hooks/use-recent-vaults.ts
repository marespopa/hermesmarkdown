"use client";

import { useCallback, useEffect, useState } from "react";
import { useAtomValue, useStore } from "jotai";
import toast from "react-hot-toast";
import {
  atom_recentVaults,
  atom_vaultDescriptor,
  atom_vaultHandle,
  atom_vaultKey,
  type VaultDescriptor,
} from "@/app/atoms/vault-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { getGitHubVaultWorkspace } from "@/app/services/github-vault-workspace";
import { loadBrowserVaultRegistry, verifyPermission } from "@/app/services/idb";
import { listBrowserVaultIds } from "@/app/services/opfs";
import {
  addRecentVault,
  loadRecentVaults,
  removeRecentVault,
  saveRecentVaults,
  type RecentVault,
} from "@/app/services/recent-vaults";

// The open vault as a recents entry.
export function recentVaultEntry(
  key: string,
  handle: FileSystemDirectoryHandle,
  descriptor: VaultDescriptor | null,
  openedAt = Date.now(),
): RecentVault {
  if (descriptor?.kind === "browser" || descriptor?.kind === "github") {
    return { key, kind: descriptor.kind, name: descriptor.displayName, descriptor, openedAt } as RecentVault;
  }
  return { key, kind: "local", name: handle.name, handle, openedAt };
}

// Mounted once, by the editor page: loads the recents list, then moves each
// vault that opens (or is restored) to the top of it. Follows descriptor
// changes too, so a GitHub vault's entry keeps its latest synced commit.
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
    const next = addRecentVault(store.get(atom_recentVaults), recentVaultEntry(vaultKey, vaultHandle, descriptor));
    store.set(atom_recentVaults, next);
    void saveRecentVaults(next);
  }, [isLoaded, vaultKey, vaultHandle, descriptor, store]);
}

// The recents other than the open vault, and ways to reopen or forget one.
// Forgetting only drops the entry; the vault's files are untouched.
export function useRecentVaults() {
  const store = useStore();
  const recentVaults = useAtomValue(atom_recentVaults);
  const vaultKey = useAtomValue(atom_vaultKey);
  const { initVaultFromHandle, openBrowserVault, isVaultSupported } = useFileSystem();

  const forgetRecentVault = useCallback((key: string) => {
    const next = removeRecentVault(store.get(atom_recentVaults), key);
    store.set(atom_recentVaults, next);
    void saveRecentVaults(next);
  }, [store]);

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
      if (entry.kind === "browser") {
        // Opening a missing browser vault would quietly create an empty one.
        if (!(await listBrowserVaultIds()).includes(entry.descriptor.id)) {
          forgetRecentVault(entry.key);
          toast.error(`"${entry.name}" no longer exists in this browser.`);
          return false;
        }
        const registry = await loadBrowserVaultRegistry();
        return openBrowserVault(registry.find((item) => item.id === entry.descriptor.id) ?? entry.descriptor);
      }
      // A GitHub vault reopens from its local copy, as on startup.
      const handle = await getGitHubVaultWorkspace(entry.descriptor);
      await initVaultFromHandle(handle, { descriptor: entry.descriptor });
      return true;
    } catch (err) {
      console.error("Failed to open recent vault:", err);
      toast.error(`Failed to open "${entry.name}".`);
      return false;
    }
  }, [isVaultSupported, initVaultFromHandle, openBrowserVault, forgetRecentVault]);

  return {
    recentVaults: recentVaults.filter((entry) => entry.key !== vaultKey),
    openRecentVault,
    forgetRecentVault,
  };
}
