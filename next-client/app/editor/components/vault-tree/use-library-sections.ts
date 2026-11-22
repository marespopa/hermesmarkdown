"use client";

import { useAtomValue } from "jotai";
import { useCallback, useMemo } from "react";
import { atom_libraryMounts, atom_vaultName } from "@/app/atoms/vault-atoms";
import { mountOf } from "@/app/services/library-roots";
import type { VisibleRow } from "./tree-model";

// The vault section's key in the remembered expansion: never a real path.
export const VAULT_SECTION_KEY = "\u0000vault";

interface SectionExpansion {
  isSectionCollapsed: (key: string) => boolean;
  setSectionOpen: (key: string, open: boolean) => void;
}

// What the tree shows of a library (services/library-roots.ts): the folder
// paths to add for locked folders (nothing of theirs is listed, but their row
// still shows), the vault's section header once folders are added (null for
// a plain vault) and whether it's collapsed, which rows that leaves visible,
// and how a top-level folder row is marked.
export function useLibrarySections(folderPaths: string[] | undefined, expansion: SectionExpansion, expandAll = false) {
  const mounts = useAtomValue(atom_libraryMounts);
  const vaultName = useAtomValue(atom_vaultName);
  const locked = useMemo(() => mounts.filter((m) => m.locked).map((m) => m.name), [mounts]);
  // A new list when the library changes, so the tree is built again (the
  // added folders sort after the vault's own top level).
  const treeFolderPaths = useMemo(
    () => (mounts.length > 0 ? [...(folderPaths ?? []), ...locked] : folderPaths),
    [mounts, folderPaths, locked],
  );
  const isLibrary = mounts.length > 0;
  const vaultSection = isLibrary ? vaultName ?? "Vault" : null;
  // Open by default; a filter (expandAll) shows everything, as for folders.
  const vaultCollapsed = isLibrary && !expandAll && expansion.isSectionCollapsed(VAULT_SECTION_KEY);
  const { setSectionOpen } = expansion;
  const toggleVault = useCallback(() => setSectionOpen(VAULT_SECTION_KEY, vaultCollapsed), [setSectionOpen, vaultCollapsed]);
  // Opens the vault's section for something about to show in it (Show in
  // Files, an item being named: its folder's path); nothing for a path in an
  // added folder, or none.
  const openVaultFor = useCallback((path: string | undefined) => {
    if (path !== undefined && vaultCollapsed && !mountOf(path)) setSectionOpen(VAULT_SECTION_KEY, true);
  }, [vaultCollapsed, setSectionOpen]);
  // With the vault's section collapsed, only the added folders' rows show.
  const visibleRows = useCallback(
    (rows: VisibleRow[]) => (vaultCollapsed ? rows.filter((row) => mountOf(row.path)) : rows),
    [vaultCollapsed],
  );
  const libraryFor = useCallback((path: string): "mount" | "locked" | undefined => {
    const mount = mounts.find((m) => m.name === path);
    if (!mount) return undefined;
    return mount.locked ? "locked" : "mount";
  }, [mounts]);
  const sectionProps = useMemo(() => ({ vaultCollapsed, onToggleVault: toggleVault }), [vaultCollapsed, toggleVault]);
  return { treeFolderPaths, vaultSection, vaultCollapsed, sectionProps, openVaultFor, visibleRows, libraryFor };
}
