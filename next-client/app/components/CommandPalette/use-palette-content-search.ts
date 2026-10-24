"use client";

import { useEffect, useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { atom_searchCodeFiles, atom_searchRegex } from "@/app/atoms/ui-atoms";
import { DEFAULT_SEARCH_LIMIT, isContentSearchAvailable, searchNoteContent } from "@/app/services/content-search-client";
import { grepTextFiles } from "@/app/services/text-grep-client";
import type { ContentHit } from "@/app/workers/content-search-protocol";
import type { GrepFile } from "@/app/workers/text-grep-protocol";
import { MIN_QUERY_CHARS } from "@/app/workers/content-search";
import { buildContentRows, type ContentRow, type FileResult } from "./palette-model";

export type ContentSearchStatus = "idle" | "short" | "searching" | "ready" | "unavailable";

// The note-text index answers from memory, so it searches almost at once;
// the grep reads from its cache, or disk the first time, so it waits a little
// longer for typing to settle.
const INDEX_DEBOUNCE_MS = 60;
const GREP_DEBOUNCE_MS = 100;
// While notes are still being indexed, search again so results and the
// "N files left" footnote keep up with the backfill.
const PENDING_REFRESH_MS = 1000;

interface SearchState {
  query: string;
  hits: ContentHit[];
  pending: number;
  capped: boolean;
}

const EMPTY: SearchState = { query: "", hits: [], pending: 0, capped: false };

interface GrepState {
  query: string;
  hits: ContentHit[];
  scanned: number;
  total: number;
  done: boolean;
  invalid?: boolean;
  stalled?: boolean;
}

const NO_GREP: GrepState = { query: "", hits: [], scanned: 0, total: 0, done: true };

// The palette's `/` scope: debounced text search in the metadata worker
// over the palette's file list minus private notes (which never match, in
// any Privacy Mode). Keeps the previous rows while a newer search runs and
// ignores superseded responses. Posts nothing while `active` is false. With
// Search Code Files on, the code and other text files are grepped too
// (text-grep-client.ts); their rows follow the notes' as they arrive. With
// Regex on, every file goes through the grep instead, as a pattern.
export function usePaletteContentSearch(active: boolean, query: string, files: FileResult[]) {
  const [result, setResult] = useState<SearchState>(EMPTY);
  const available = isContentSearchAvailable();
  const trimmed = query.trim();
  const isShort = trimmed.length < MIN_QUERY_CHARS;

  const searchCodeFiles = useAtomValue(atom_searchCodeFiles);
  const regex = useAtomValue(atom_searchRegex);
  const [grep, setGrep] = useState<GrepState>(NO_GREP);

  const searchable = useMemo(() => files.filter((file) => !file.isPrivate), [files]);
  const filesByPath = useMemo(() => new Map(searchable.map((file) => [file.path, file])), [searchable]);
  const paths = useMemo(() => searchable.filter((file) => !file.isText).map((file) => file.path), [searchable]);
  const grepFiles = useMemo<GrepFile[]>(
    () => searchable
      .filter((file) => (file.isText ? searchCodeFiles : regex))
      .map(({ path, name, handle, isText }) => ({ path, name, handle, ...(isText ? {} : { isNote: true }) })),
    [regex, searchCodeFiles, searchable],
  );
  const greps = active && available && !isShort && grepFiles.length > 0;
  const searchesIndex = active && available && !isShort && !regex;

  useEffect(() => {
    if (!greps) return;
    let stop = () => {};
    const timer = setTimeout(() => {
      stop = grepTextFiles(trimmed, grepFiles, DEFAULT_SEARCH_LIMIT, (progress) => setGrep({ query: trimmed, ...progress }), regex ? "regex" : "text");
    }, GREP_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, [greps, grepFiles, regex, trimmed]);

  useEffect(() => {
    if (!searchesIndex) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const run = async () => {
      const next = await searchNoteContent(trimmed, paths);
      // null: a newer search replaced this one (or the worker timed out).
      if (cancelled || !next) return;
      setResult({ query: trimmed, ...next });
      if (next.pending > 0 && !next.capped) timer = setTimeout(run, PENDING_REFRESH_MS);
    };
    timer = setTimeout(run, INDEX_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchesIndex, paths, trimmed]);

  // Both keep their previous rows until the newer search answers, so the
  // list never blanks between keystrokes.
  const grepHits = greps ? grep.hits : NO_GREP.hits;
  const indexHits = searchesIndex ? result.hits : EMPTY.hits;
  const rows = useMemo<ContentRow[]>(
    () => (active && available && !isShort ? buildContentRows([...indexHits, ...grepHits], filesByPath) : []),
    [active, available, filesByPath, grepHits, indexHits, isShort],
  );

  const grepCurrent = grep.query === trimmed;
  const answered = regex ? !greps || grepCurrent : result.query === trimmed;
  const status: ContentSearchStatus = !available ? "unavailable"
    : !active ? "idle"
      : isShort ? "short"
        : answered ? "ready" : "searching";

  const showsProgress = active && available && !isShort;
  const fileScan = greps && (!grepCurrent || !grep.done)
    ? { scanned: grepCurrent ? grep.scanned : 0, total: grepFiles.length }
    : null;
  return {
    rows,
    status,
    pending: searchesIndex ? result.pending : 0,
    capped: searchesIndex && result.capped,
    /** Files still being grepped, while that runs. */
    fileScan,
    /** Regex on: the query isn't a valid pattern. */
    invalid: showsProgress && regex && grepCurrent && !!grep.invalid,
    /** Regex on: the pattern ran too long and was stopped. */
    stalled: showsProgress && regex && grepCurrent && !!grep.stalled,
    regex,
  };
}
