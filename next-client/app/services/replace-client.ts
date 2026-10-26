"use client";

// Main-thread side of the Replace in Files scan. It runs the same worker
// script as the palette's text grep (app/workers/text-grep.worker.ts) but on
// its own instance, so the palette's search and the scan never cancel each
// other and a stalled regex only stops this one. The worker starts with the
// first scan and is terminated when the page closes (disposeReplaceWorker).
// A newer scan supersedes the one before; a regex scan that goes 2.5 s
// without a report is stuck on a pattern that backtracks: the worker is shut
// down and the scan ends `stalled`.

import type { ReplaceQuery } from "@/app/workers/replace-search";
import type { GrepFile, ReplaceFileResult, ReplaceScanResults, GrepRequest } from "@/app/workers/text-grep-protocol";
import { withContent } from "./text-grep-client";

export interface ReplaceScanProgress {
  /** Accumulated across reports. */
  files: ReplaceFileResult[];
  scanned: number;
  total: number;
  matchCount: number;
  done: boolean;
  capped?: boolean;
  invalid?: boolean;
  /** Stopped because the pattern ran too long (set here). */
  stalled?: boolean;
}

const STALL_MS = 2500;

let worker: Worker | null | undefined;
let lastScanId = 0;
let stopListening: (() => void) | null = null;

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = typeof Worker === "undefined" ? null : new Worker(new URL("../workers/text-grep.worker.ts", import.meta.url));
  } catch {
    worker = null;
  }
  return worker;
}

export function isReplaceAvailable(): boolean {
  return typeof Worker !== "undefined";
}

function cancelScan(): void {
  stopListening?.();
  stopListening = null;
  worker?.postMessage({ type: "replace:cancel" } satisfies GrepRequest);
}

export function disposeReplaceWorker(): void {
  stopListening?.();
  stopListening = null;
  worker?.terminate();
  worker = undefined;
}

// Scans `files` for `query`, calling `onProgress` as results come in.
// Returns a function that stops it.
export function scanForReplace(query: ReplaceQuery, files: GrepFile[], onProgress: (progress: ReplaceScanProgress) => void): () => void {
  const target = getWorker();
  if (!target) return () => {};
  cancelScan();
  const scanId = ++lastScanId;
  let last: ReplaceScanProgress = { files: [], scanned: 0, total: files.length, matchCount: 0, done: false };
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  const watch = () => {
    if (!query.regex) return;
    clearTimeout(watchdog);
    watchdog = setTimeout(() => {
      stop();
      target.terminate();
      if (worker === target) worker = undefined;
      onProgress({ ...last, done: true, stalled: true });
    }, STALL_MS);
  };
  const onMessage = (event: MessageEvent) => {
    const data = event.data as ReplaceScanResults | undefined;
    if (data?.type !== "replace:results" || data.scanId !== scanId) return;
    last = {
      files: [...last.files, ...data.files],
      scanned: data.scanned,
      total: data.total,
      matchCount: data.matchCount,
      done: data.done,
      ...(data.capped ? { capped: true } : {}),
      ...(data.invalid ? { invalid: true } : {}),
    };
    onProgress(last);
    if (data.done) stop();
    else watch();
  };
  const stop = () => {
    clearTimeout(watchdog);
    target.removeEventListener("message", onMessage);
    if (stopListening === stop) stopListening = null;
  };
  stopListening = stop;
  target.addEventListener("message", onMessage);

  const send = (payload: GrepFile[]) => target.postMessage({ type: "replace:scan", scanId, query, files: payload } satisfies GrepRequest);
  watch();
  try {
    send(files);
  } catch {
    void withContent(files).then((payload) => {
      if (stopListening === stop) send(payload);
    });
  }
  return () => {
    if (stopListening === stop) cancelScan();
  };
}
