import { readKey, writeKey } from "./idb";
import type { VaultTreeSnapshot } from "@/app/atoms/tree-snapshot-atoms";

// The vault's file tree as last seen, by vault key, in the vault-handle
// store (idb.ts): paths and folders only, nothing of the notes' contents.
// Saved when a walk of the vault finishes, read on the next startup so the
// sidebar shows the tree before the walk is over.

const keyFor = (vaultKey: string) => `treeSnapshot:${vaultKey}`;

const isSnapshot = (value: unknown): value is VaultTreeSnapshot =>
  !!value && typeof value === "object"
  && Array.isArray((value as VaultTreeSnapshot).files)
  && Array.isArray((value as VaultTreeSnapshot).folders);

export async function loadVaultTreeSnapshot(vaultKey: string): Promise<VaultTreeSnapshot | null> {
  if (typeof window === "undefined" || !window.indexedDB) return null;
  try {
    const value = await readKey<unknown>(keyFor(vaultKey));
    return isSnapshot(value) ? { vaultKey, files: value.files, folders: value.folders } : null;
  } catch {
    return null;
  }
}

export async function saveVaultTreeSnapshot(snapshot: VaultTreeSnapshot): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) return;
  try {
    await writeKey(keyFor(snapshot.vaultKey), { files: snapshot.files, folders: snapshot.folders });
  } catch (err) {
    console.warn("Failed to save the file tree snapshot:", err);
  }
}
