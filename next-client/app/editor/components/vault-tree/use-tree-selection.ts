"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VisibleRow } from "./tree-model";

export interface ClickModifiers {
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
}

const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((p) => b.has(p));

// Finder-style selection over the visible rows: a click selects one row,
// ⌘/Ctrl-click adds or removes one, Shift-click selects the range from the
// last plainly clicked row (the anchor). `focusPath` is the keyboard cursor.
// Rows that stop being visible (collapsed, renamed, deleted) drop out.
export function useTreeSelection(rows: VisibleRow[]) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [focusPath, setFocusPath] = useState<string | null>(null);
  const anchorRef = useRef<string | null>(null);

  useEffect(() => {
    const visible = new Set(rows.map((row) => row.path));
    setSelected((prev) => {
      const next = new Set([...prev].filter((p) => visible.has(p)));
      return sameSet(prev, next) ? prev : next;
    });
    setFocusPath((prev) => (prev && !visible.has(prev) ? null : prev));
    if (anchorRef.current && !visible.has(anchorRef.current)) anchorRef.current = null;
  }, [rows]);

  const selectOnly = useCallback((path: string) => {
    setSelected(new Set([path]));
    setFocusPath(path);
    anchorRef.current = path;
  }, []);

  const toggle = useCallback((path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
    setFocusPath(path);
    anchorRef.current = path;
  }, []);

  // Selects anchor…path (inclusive) in visible order; from `path` alone
  // without an anchor.
  const selectRange = useCallback((path: string) => {
    const order = rows.map((row) => row.path);
    const anchor = anchorRef.current && order.includes(anchorRef.current) ? anchorRef.current : path;
    const [from, to] = [order.indexOf(anchor), order.indexOf(path)].sort((a, b) => a - b);
    setSelected(new Set(order.slice(from, to + 1)));
    setFocusPath(path);
    if (!anchorRef.current) anchorRef.current = anchor;
  }, [rows]);

  // Selects exactly `paths` (e.g. items just moved or created), focusing the
  // first.
  const selectPaths = useCallback((paths: string[]) => {
    setSelected(new Set(paths));
    setFocusPath(paths[0] ?? null);
    anchorRef.current = paths[0] ?? null;
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(rows.map((row) => row.path)));
  }, [rows]);

  const clear = useCallback(() => {
    setSelected((prev) => (prev.size === 0 ? prev : new Set()));
  }, []);

  // Returns whether it was a plain click (the row's own action — open,
  // expand — should follow) rather than a selection change only.
  const click = useCallback((path: string, mods: ClickModifiers): boolean => {
    if (mods.shiftKey) {
      selectRange(path);
      return false;
    }
    if (mods.metaKey || mods.ctrlKey) {
      toggle(path);
      return false;
    }
    selectOnly(path);
    return true;
  }, [selectRange, toggle, selectOnly]);

  return { selected, focusPath, setFocusPath, selectOnly, toggle, selectRange, selectPaths, selectAll, clear, click };
}
