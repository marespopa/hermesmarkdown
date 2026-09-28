"use client";

import { atom_fileTreeExpansion, type FileTreeExpansion } from "@/app/atoms/ui-atoms";
import { atom_vaultKey } from "@/app/atoms/vault-atoms";
import { useAtom, useAtomValue } from "jotai";
import { useCallback, useMemo } from "react";

const EMPTY: FileTreeExpansion = { expanded: [], collapsed: [] };

// Folders are collapsed by default; the only automatic exception is the
// chain of ancestor folders leading to the active file. Manual toggles
// (in either direction) override that default until the user toggles again,
// and are remembered per vault across reloads.
export function useFolderExpansion(activeAncestorPaths: Set<string>) {
  const vaultKey = useAtomValue(atom_vaultKey);
  const [allExpansion, setAllExpansion] = useAtom(atom_fileTreeExpansion);
  const entry = (vaultKey && allExpansion[vaultKey]) || EMPTY;

  const expanded = useMemo(() => new Set(entry.expanded), [entry.expanded]);
  const collapsed = useMemo(() => new Set(entry.collapsed), [entry.collapsed]);

  const isFolderCollapsed = useCallback((path: string) => {
    if (expanded.has(path)) return false;
    if (collapsed.has(path)) return true;
    return !activeAncestorPaths.has(path);
  }, [expanded, collapsed, activeAncestorPaths]);

  const setOverride = useCallback((path: string, open: boolean) => {
    if (!vaultKey) return;
    setAllExpansion((prev) => {
      const current = prev[vaultKey] || EMPTY;
      const without = (list: string[]) => list.filter((p) => p !== path);
      const next: FileTreeExpansion = open
        ? { expanded: [...without(current.expanded), path], collapsed: without(current.collapsed) }
        : { expanded: without(current.expanded), collapsed: [...without(current.collapsed), path] };
      return { ...prev, [vaultKey]: next };
    });
  }, [vaultKey, setAllExpansion]);

  const toggleFolder = useCallback((path: string) => {
    setOverride(path, isFolderCollapsed(path));
  }, [isFolderCollapsed, setOverride]);

  const expandFolder = useCallback((path: string) => {
    if (isFolderCollapsed(path)) setOverride(path, true);
  }, [isFolderCollapsed, setOverride]);

  return { isFolderCollapsed, toggleFolder, expandFolder };
}
