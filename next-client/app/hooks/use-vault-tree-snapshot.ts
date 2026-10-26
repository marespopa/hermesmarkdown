"use client";

import { useCallback, useEffect } from "react";
import { useAtomValue, useStore } from "jotai";
import { atom_vaultTreeListedKey, atom_vaultTreeSnapshot } from "@/app/atoms/tree-snapshot-atoms";
import { atom_openingFilePath } from "@/app/atoms/ui-atoms";
import { atom_vaultHandle, atom_vaultKey, resolveFileHandleAtPath } from "@/app/atoms/vault-atoms";
import { showErrorToast } from "@/app/components/Toastr";
import { loadVaultTreeSnapshot } from "@/app/services/vault-tree-snapshot";

// On startup the sidebar's tree shows the vault as it was last seen
// (services/vault-tree-snapshot.ts) until the walk has listed every file
// (markVaultTreeListed); useVaultFileSearch merges it under the rows found
// so far. Mounted once by EditorShell.
export function useVaultTreeSnapshot(): void {
  const store = useStore();
  const vaultKey = useAtomValue(atom_vaultKey);
  useEffect(() => {
    if (!vaultKey || store.get(atom_vaultTreeListedKey) === vaultKey) return;
    let cancelled = false;
    void loadVaultTreeSnapshot(vaultKey).then((snapshot) => {
      // Too late once the walk is over: it lists what's really there.
      if (cancelled || !snapshot || store.get(atom_vaultTreeListedKey) === vaultKey) return;
      store.set(atom_vaultTreeSnapshot, snapshot);
    });
    return () => {
      cancelled = true;
    };
  }, [store, vaultKey]);
}

/**
 * Opens a row that so far only the snapshot lists (no handle yet): the file
 * is found through the vault by its path. A file that's gone shows a toast
 * and its row goes away (the optimistic open rolled back).
 */
export function useOpenSnapshotRow(openHandle: (handle: FileSystemFileHandle, path: string) => unknown) {
  const store = useStore();
  return useCallback(async (path: string) => {
    const vault = store.get(atom_vaultHandle);
    if (!vault) return;
    // Optimistic: the row and the pane show it as opening at once.
    store.set(atom_openingFilePath, path);
    try {
      const handle = await resolveFileHandleAtPath(vault, path);
      await openHandle(handle, path);
    } catch (err) {
      store.set(atom_openingFilePath, (current) => (current === path ? null : current));
      const name = (path.split("/").pop() ?? path).replace(/\.md$/i, "");
      if ((err as { name?: string } | null)?.name === "NotFoundError") {
        showErrorToast(`“${name}” isn't in this vault any more.`);
        store.set(atom_vaultTreeSnapshot, (prev) => (prev ? { ...prev, files: prev.files.filter((file) => file !== path) } : prev));
      } else {
        showErrorToast(`Couldn't open “${name}”.`);
      }
    }
  }, [store, openHandle]);
}
