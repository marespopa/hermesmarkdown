"use client";

import { useEffect, useRef } from "react";
import type { VisibleRow } from "./tree-model";

// The folders above a vault path ("a/b/c.md" → "a", "a/b"): opened and
// marked in the tree for the active file.
export function ancestorFolders(path: string | null): Set<string> {
  const ancestors = new Set<string>();
  if (!path) return ancestors;
  const segments = path.split("/");
  segments.pop();
  let acc = "";
  for (const segment of segments) {
    acc = acc ? `${acc}/${segment}` : segment;
    ancestors.add(acc);
  }
  return ancestors;
}

// Opening a file (from the palette, a link, a tab) selects its row, as in a
// code editor's explorer. Once per change of active file, after its folders
// have opened, so clicks and multi-selects made since stand.
export function useSelectActiveRow({
  activeFilePath,
  treeView,
  rows,
  selectOnly,
}: {
  activeFilePath: string | null;
  treeView: boolean;
  rows: VisibleRow[];
  selectOnly: (path: string) => void;
}) {
  const selectedActiveRef = useRef<string | null>(null);
  useEffect(() => {
    if (!treeView || !activeFilePath) {
      selectedActiveRef.current = null;
      return;
    }
    if (selectedActiveRef.current === activeFilePath) return;
    if (!rows.some((row) => row.path === activeFilePath)) return;
    selectedActiveRef.current = activeFilePath;
    selectOnly(activeFilePath);
  }, [treeView, activeFilePath, rows, selectOnly]);
}
