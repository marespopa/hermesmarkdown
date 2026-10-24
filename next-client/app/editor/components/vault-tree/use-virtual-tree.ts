"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { treeItems, type PendingCreate } from "./TreeNodes";
import { type VisibleRow, VIRTUALIZE_THRESHOLD } from "./tree-model";

interface UseVirtualTreeOptions {
  treeView: boolean;
  rows: VisibleRow[];
  pendingCreate: PendingCreate | null;
  isFolderCollapsed: (path: string) => boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
}

export function useVirtualTree({ treeView, rows, pendingCreate, isFolderCollapsed, scrollRef }: UseVirtualTreeOptions) {
  // The tree as one flat list of lines; past VIRTUALIZE_THRESHOLD only the
  // lines in view (and a margin) are rendered, as fixed-height rows. The
  // list scrolls in its own box on the Files page, and with the whole
  // sidebar there (`data-scroll-root`), below its other sections, which is
  // the offset (`scrollMargin`) the virtualizer counts from.
  const items = useMemo(
    () => (treeView ? treeItems(rows, pendingCreate, isFolderCollapsed) : []),
    [treeView, rows, pendingCreate, isFolderCollapsed],
  );
  const virtualizeTree = treeView && items.length > VIRTUALIZE_THRESHOLD;
  const listRef = useRef<HTMLDivElement>(null);
  const [treeScroller, setTreeScroller] = useState<HTMLElement | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!virtualizeTree || !list) return;
    const scroller = list.closest<HTMLElement>("[data-scroll-root]") ?? scrollRef.current;
    if (!scroller) return;
    setTreeScroller(scroller);
    const measure = () => {
      const margin = list.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      setScrollMargin((previous) => (Math.abs(previous - margin) < 0.5 ? previous : margin));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    // The sections above the list (Pinned, the Search field) can grow.
    const observer = new ResizeObserver(measure);
    for (const child of Array.from(scroller.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [virtualizeTree, scrollRef]);
  const treeVirtualizer = useVirtualizer({
    count: virtualizeTree ? items.length : 0,
    getScrollElement: () => treeScroller,
    estimateSize: () => 28,
    overscan: 16,
    scrollMargin,
    getItemKey: (index) => items[index]?.key ?? index,
  });
  // Scrolls a row into view while virtualized (its element may not exist);
  // null when the tree renders every row, so the caller finds it in the DOM.
  const scrollToRow = useCallback((path: string): boolean | null => {
    if (!virtualizeTree) return null;
    const index = items.findIndex((item) => item.kind === "row" && item.row.path === path);
    if (index === -1) return false;
    treeVirtualizer.scrollToIndex(index, { align: "auto" });
    return true;
  }, [virtualizeTree, items, treeVirtualizer]);

  return { items, virtualizeTree, listRef, treeVirtualizer, scrollMargin, scrollToRow };
}
