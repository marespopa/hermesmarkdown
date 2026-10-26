"use client";

import { useEffect } from "react";
import { prefetchNote } from "@/app/hooks/file-system/note-prefetch";
import { HOVER_PREFETCH_MS } from "@/app/hooks/file-system/use-hover-prefetch";
import type { Row } from "./palette-model";

// The highlighted row's note is read ahead (note-prefetch.ts) once the
// highlight rests on it for a moment, so Enter finds its text in memory.
// Arrowing through the list starts nothing.
export function usePalettePrefetch(isOpen: boolean, row: Row | undefined): void {
  const file = isOpen && (row?.kind === "file" || row?.kind === "content") ? row.file : null;
  const path = file?.path;
  const handle = file?.handle;
  useEffect(() => {
    if (!path || !handle) return;
    const timer = setTimeout(() => prefetchNote(path, handle), HOVER_PREFETCH_MS);
    return () => clearTimeout(timer);
  }, [path, handle]);
}
