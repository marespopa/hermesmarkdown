import { atom } from "jotai";

// The vault's file tree as last seen (paths and folders, no contents),
// shown on startup until the vault's walk has listed every file again
// (services/vault-tree-snapshot.ts, hooks/use-vault-tree-snapshot.ts).
export interface VaultTreeSnapshot {
  vaultKey: string;
  files: string[];
  folders: string[];
}

export const atom_vaultTreeSnapshot = atom<VaultTreeSnapshot | null>(null);

// The vault key whose walk has listed every file this session: from then
// on the tree shows only what's really there.
export const atom_vaultTreeListedKey = atom<string | null>(null);
