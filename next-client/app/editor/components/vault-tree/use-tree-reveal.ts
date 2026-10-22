"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import type { VisibleRow } from "./tree-model";

// The tree controller's `reveal(path)` ("Show in Files"): selects the row at
// `path` and scrolls it into view, with the tree focused. It waits for the
// row, since the folders above it may open in the same update that asked.
export function useTreeReveal({
  rows,
  selectOnly,
  scrollToPath,
  scrollRef,
}: {
  rows: VisibleRow[];
  selectOnly: (path: string) => void;
  scrollToPath: (path: string) => boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  const pendingRef = useRef<string | null>(null);
  const [request, setRequest] = useState(0);

  useEffect(() => {
    const path = pendingRef.current;
    if (!path || !rows.some((row) => row.path === path)) return;
    pendingRef.current = null;
    selectOnly(path);
    scrollRef.current?.focus({ preventScroll: true });
    scrollToPath(path);
  }, [request, rows, selectOnly, scrollToPath, scrollRef]);

  return useCallback((path: string) => {
    pendingRef.current = path;
    setRequest((n) => n + 1);
  }, []);
}
