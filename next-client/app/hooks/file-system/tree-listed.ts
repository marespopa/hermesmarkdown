import type { createStore } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_vaultTreeListedKey, atom_vaultTreeSnapshot } from "@/app/atoms/tree-snapshot-atoms";
import { atom_vaultFolderPaths, atom_vaultTextFiles } from "@/app/atoms/vault-atoms";
import { saveVaultTreeSnapshot } from "@/app/services/vault-tree-snapshot";

type Store = ReturnType<typeof createStore>;

// The vault's walk has listed every file: the tree shows only what's really
// there from now on (the startup snapshot is dropped), and what it lists is
// saved as the snapshot for the next startup.
export function markVaultTreeListed(store: Store, vaultKey: string | null): void {
  if (!vaultKey) return;
  store.set(atom_vaultTreeListedKey, vaultKey);
  store.set(atom_vaultTreeSnapshot, null);
  const files = [...Object.keys(store.get(atom_fileMetadata)), ...store.get(atom_vaultTextFiles).map((file) => file.path)];
  void saveVaultTreeSnapshot({ vaultKey, files, folders: store.get(atom_vaultFolderPaths) });
}
