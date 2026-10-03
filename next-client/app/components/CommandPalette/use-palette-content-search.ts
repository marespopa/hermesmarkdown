"use client";

import { useEffect, useMemo, useState } from "react";
import { isContentSearchAvailable, searchNoteContent } from "@/app/services/content-search-client";
import type { ContentHit } from "@/app/workers/content-search-protocol";
import { MIN_QUERY_CHARS } from "@/app/workers/content-search";
import { buildContentRows, type ContentRow, type FileResult } from "./palette-model";

export type ContentSearchStatus = "idle" | "short" | "searching" | "ready" | "unavailable";

const DEBOUNCE_MS = 150;
// While notes are still being indexed, search again so results and the
// "N notes left" footnote keep up with the backfill.
const PENDING_REFRESH_MS = 1000;

interface SearchState {
  query: string;
  hits: ContentHit[];
  pending: number;
  capped: boolean;
}

const EMPTY: SearchState = { query: "", hits: [], pending: 0, capped: false };

// The palette's `/` scope: debounced note-text search in the metadata worker
// over the palette's file list minus sensitive notes (which never match, in
// any Privacy Mode). Keeps the previous rows while a newer search runs and
// ignores superseded responses. Posts nothing while `active` is false.
export function usePaletteContentSearch(active: boolean, query: string, files: FileResult[]) {
  const [result, setResult] = useState<SearchState>(EMPTY);
  const available = isContentSearchAvailable();
  const trimmed = query.trim();
  const isShort = trimmed.length < MIN_QUERY_CHARS;

  const searchable = useMemo(() => files.filter((file) => !file.isSensitive), [files]);
  const filesByPath = useMemo(() => new Map(searchable.map((file) => [file.path, file])), [searchable]);
  const paths = useMemo(() => searchable.map((file) => file.path), [searchable]);

  useEffect(() => {
    if (!active || !available || isShort) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const run = async () => {
      const next = await searchNoteContent(trimmed, paths);
      // null: a newer search replaced this one (or the worker timed out).
      if (cancelled || !next) return;
      setResult({ query: trimmed, ...next });
      if (next.pending > 0 && !next.capped) timer = setTimeout(run, PENDING_REFRESH_MS);
    };
    timer = setTimeout(run, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, available, isShort, paths, trimmed]);

  const rows = useMemo<ContentRow[]>(
    () => (active && available && !isShort ? buildContentRows(result.hits, filesByPath) : []),
    [active, available, filesByPath, isShort, result.hits],
  );

  const status: ContentSearchStatus = !available ? "unavailable"
    : !active ? "idle"
      : isShort ? "short"
        : result.query === trimmed ? "ready" : "searching";

  const showsProgress = active && available && !isShort;
  return {
    rows,
    status,
    pending: showsProgress ? result.pending : 0,
    capped: showsProgress && result.capped,
  };
}
