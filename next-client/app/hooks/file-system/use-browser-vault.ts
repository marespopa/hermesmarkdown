"use client";

import { useAtom, useStore } from "jotai";
import { useCallback } from "react";
import toast from "react-hot-toast";
import { atom_vaultDescriptor, type VaultDescriptor } from "@/app/atoms/atoms";
import { atom_recentVaults } from "@/app/atoms/vault-atoms";
import {
  loadBrowserVaultRegistry,
  removeBrowserVaultDescriptor,
  renameBrowserVaultDescriptor,
} from "@/app/services/idb";
import { renameRecentBrowserVault, saveRecentVaults } from "@/app/services/recent-vaults";
import {
  BROWSER_VAULT_DESCRIPTOR_VERSION,
  createBrowserVaultDescriptor,
  deleteBrowserVaultWorkspace,
  getBrowserVaultWorkspace,
  isBrowserVaultBackupDue,
  listBrowserVaultIds,
  normalizeBrowserVaultName,
  requestPersistentStorage,
  type BrowserVaultDescriptor,
} from "@/app/services/opfs";

interface UseBrowserVaultProps {
  initVaultFromHandle: (
    handle: FileSystemDirectoryHandle,
    options?: { isNewVault?: boolean; descriptor?: VaultDescriptor },
  ) => Promise<void>;
  closeVault: () => void;
}

// Vaults kept in the browser's private storage. They work in every modern
// browser, including those without disk folder access, and use the same
// handle-based file layer as disk vaults.
export function useBrowserVault({ initVaultFromHandle, closeVault }: UseBrowserVaultProps) {
  const [vaultDescriptor, setVaultDescriptor] = useAtom(atom_vaultDescriptor);
  const store = useStore();

  // Known vaults, plus any folder in storage whose registry entry was lost
  // (so its notes can still be reopened and exported).
  const listBrowserVaults = useCallback(async (): Promise<BrowserVaultDescriptor[]> => {
    const [registry, ids] = await Promise.all([loadBrowserVaultRegistry(), listBrowserVaultIds()]);
    const existing = new Set(ids);
    const known = registry.filter((entry) => existing.has(entry.id));
    const orphans = ids
      .filter((id) => !known.some((entry) => entry.id === id))
      .map((id): BrowserVaultDescriptor => ({
        version: BROWSER_VAULT_DESCRIPTOR_VERSION,
        kind: "browser",
        id,
        displayName: `Recovered vault ${id.slice(0, 8)}`,
        createdAt: 0,
      }));
    return [...known, ...orphans];
  }, []);

  const openBrowserVault = useCallback(async (
    descriptor: BrowserVaultDescriptor,
    options?: { isNewVault?: boolean },
  ): Promise<boolean> => {
    try {
      const handle = await getBrowserVaultWorkspace(descriptor);
      // Ask once per open; the browser remembers a grant.
      const persisted = await requestPersistentStorage();
      await initVaultFromHandle(handle, { descriptor, isNewVault: options?.isNewVault });
      if (!persisted) {
        toast("This browser may clear stored vaults when space runs low. Install the app or export backups.", {
          id: "browser-vault-persist",
          duration: 7000,
        });
      } else if (!options?.isNewVault && isBrowserVaultBackupDue(descriptor)) {
        toast("It's been a while since this vault was backed up. Export it from the command palette.", {
          id: "browser-vault-backup",
          duration: 7000,
        });
      }
      return true;
    } catch (err) {
      console.error("Failed to open browser vault:", err);
      toast.error("Failed to open the browser vault.");
      return false;
    }
  }, [initVaultFromHandle]);

  const createBrowserVault = useCallback(async (displayName: string): Promise<boolean> => {
    let descriptor: BrowserVaultDescriptor;
    try {
      descriptor = createBrowserVaultDescriptor(displayName);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid vault name.");
      return false;
    }
    return openBrowserVault(descriptor, { isNewVault: true });
  }, [openBrowserVault]);

  // Permanently removes the vault's files from browser storage.
  const deleteBrowserVault = useCallback(async (descriptor: BrowserVaultDescriptor): Promise<boolean> => {
    try {
      if (vaultDescriptor?.kind === "browser" && vaultDescriptor.id === descriptor.id) closeVault();
      await deleteBrowserVaultWorkspace(descriptor.id);
      await removeBrowserVaultDescriptor(descriptor.id);
      toast.success(`Deleted vault: ${descriptor.displayName}`);
      return true;
    } catch (err) {
      console.error("Failed to delete browser vault:", err);
      toast.error("Failed to delete the browser vault.");
      return false;
    }
  }, [vaultDescriptor, closeVault]);

  // Changes only the display name: the notes stay in the same storage folder
  // (by id), so pins, filters and recents keyed by the id carry over.
  const renameBrowserVault = useCallback(async (descriptor: BrowserVaultDescriptor, displayName: string): Promise<boolean> => {
    let name: string;
    try {
      name = normalizeBrowserVaultName(displayName);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid vault name.");
      return false;
    }
    if (name === descriptor.displayName) return true;
    try {
      const updated = (await renameBrowserVaultDescriptor(descriptor.id, name)) ?? { ...descriptor, displayName: name };
      if (vaultDescriptor?.kind === "browser" && vaultDescriptor.id === descriptor.id) setVaultDescriptor(updated);
      const recents = renameRecentBrowserVault(store.get(atom_recentVaults), updated);
      store.set(atom_recentVaults, recents);
      await saveRecentVaults(recents);
      toast.success(`Renamed vault to ${name}`);
      return true;
    } catch (err) {
      console.error("Failed to rename browser vault:", err);
      toast.error("Failed to rename the browser vault.");
      return false;
    }
  }, [vaultDescriptor, setVaultDescriptor, store]);

  return { listBrowserVaults, openBrowserVault, createBrowserVault, renameBrowserVault, deleteBrowserVault };
}
