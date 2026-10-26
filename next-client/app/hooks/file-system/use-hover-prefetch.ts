"use client";

import { useCallback, useEffect, useRef } from "react";
import type React from "react";
import { prefetchNote } from "./note-prefetch";

// How long the pointer rests on a row before its note is read ahead (ms).
export const HOVER_PREFETCH_MS = 100;

export interface PrefetchTarget {
  path: string;
  handle: FileSystemFileHandle | null | undefined;
}

/**
 * Pointer handlers for rows that open a note: resting on one for a moment
 * prefetches its text (note-prefetch.ts). Touch has no hover, so a touch
 * never prefetches. A null target (a folder, a missing note) does nothing.
 * One timer for every row of a list, so it works inside a `map`.
 */
export function useHoverPrefetchHandlers() {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return useCallback((target: PrefetchTarget | null) => ({
    onPointerEnter: (event: React.PointerEvent) => {
      const { path, handle } = target ?? {};
      if (!path || !handle || event.pointerType === "touch") return;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => prefetchNote(path, handle), HOVER_PREFETCH_MS);
    },
    onPointerLeave: () => clearTimeout(timer.current),
  }), []);
}

/** The handlers for one row (useHoverPrefetchHandlers). */
export function useHoverPrefetch(target: PrefetchTarget | null) {
  return useHoverPrefetchHandlers()(target);
}
