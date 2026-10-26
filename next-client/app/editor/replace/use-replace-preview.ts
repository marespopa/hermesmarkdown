"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { disposeReplaceWorker, scanForReplace, type ReplaceScanProgress } from "@/app/services/replace-client";
import { textFingerprint, type ReplaceQuery } from "@/app/workers/replace-search";
import type { GrepFile, ReplaceFileResult } from "@/app/workers/text-grep-protocol";

const DEBOUNCE_MS = 250;
const NO_FILES: ReplaceFileResult[] = [];

export interface ReplacePreview {
  /** In scan order; sort for display. */
  files: ReplaceFileResult[];
  scanned: number;
  total: number;
  matchCount: number;
  /** The scan for the current query has finished. */
  done: boolean;
  capped: boolean;
  invalid: boolean;
  stalled: boolean;
  /** Changes whenever the rows belong to a new search (reset exclusions on it). */
  scanKey: string;
  refresh: () => void;
}

// A signature of what a rescan depends on: the set of paths, and the text of
// files sent as text (dirty tabs). Not the array identity, which changes on
// every vault rescan.
function filesSignature(files: GrepFile[]): string {
  return files.map((file) => (file.content === undefined ? file.path : `${file.path}\u0000${textFingerprint(file.content)}`)).join("\u0001");
}

// Runs the replace scan 250 ms after Find, the options or the file list stop
// changing. The previous rows stay until the new scan answers (`done` is
// false meanwhile, so nothing can be applied from stale rows).
export function useReplacePreview(query: ReplaceQuery, files: GrepFile[], enabled: boolean): ReplacePreview {
  const { find, matchCase, wholeWord, regex } = query;
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<{ key: string; progress: ReplaceScanProgress } | null>(null);
  const filesRef = useRef(files);
  const signature = useMemo(() => filesSignature(files), [files]);
  const active = enabled && find !== "";
  const scanKey = `${find}\u0002${matchCase}${wholeWord}${regex}\u0002${signature}\u0002${nonce}`;

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    if (!active) return;
    let stop = () => {};
    const timer = setTimeout(() => {
      stop = scanForReplace({ find, matchCase, wholeWord, regex }, filesRef.current, (progress) => setState({ key: scanKey, progress }));
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, [active, find, matchCase, wholeWord, regex, scanKey]);

  useEffect(() => disposeReplaceWorker, []);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  const progress = active ? state?.progress : undefined;
  const current = !!progress && state?.key === scanKey;
  return {
    files: progress?.files ?? NO_FILES,
    scanned: progress?.scanned ?? 0,
    total: progress?.total ?? 0,
    matchCount: progress?.matchCount ?? 0,
    done: current && progress.done,
    capped: !!progress?.capped,
    invalid: !!progress?.invalid,
    stalled: !!progress?.stalled,
    scanKey,
    refresh,
  };
}
