"use client";

import { useAtomValue } from "jotai";
import { useCallback, useMemo } from "react";
import { atom_libraryMounts, atom_vaultName } from "@/app/atoms/vault-atoms";

// What the tree shows of a library (services/library-roots.ts): the folder
// paths to add for locked folders (nothing of theirs is listed, but their row
// still shows), the vault's section header once folders are added (null for
// a plain vault), and how a top-level folder row is marked.
export function useLibrarySections(folderPaths: string[] | undefined) {
  const mounts = useAtomValue(atom_libraryMounts);
  const vaultName = useAtomValue(atom_vaultName);
  const locked = useMemo(() => mounts.filter((m) => m.locked).map((m) => m.name), [mounts]);
  // A new list when the library changes, so the tree is built again (the
  // added folders sort after the vault's own top level).
  const treeFolderPaths = useMemo(
    () => (mounts.length > 0 ? [...(folderPaths ?? []), ...locked] : folderPaths),
    [mounts, folderPaths, locked],
  );
  const vaultSection = mounts.length > 0 ? vaultName ?? "Vault" : null;
  const libraryFor = useCallback((path: string): "mount" | "locked" | undefined => {
    const mount = mounts.find((m) => m.name === path);
    if (!mount) return undefined;
    return mount.locked ? "locked" : "mount";
  }, [mounts]);
  return { treeFolderPaths, vaultSection, libraryFor };
}
