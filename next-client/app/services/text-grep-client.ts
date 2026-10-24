"use client";

// Main-thread side of the text-file grep (app/workers/text-grep.worker.ts).
// The worker starts on the first search, so it costs nothing until Search
// Code Files or Regex is on and used. Each search replaces the one before.
// A regex search that goes 2.5 s without a report is stuck on a pattern that
// backtracks: the worker is shut down (it can't be interrupted otherwise)
// and the search ends `stalled`; the next search starts a fresh one. A
// search stuck behind an earlier one (no report of its own yet) is retried
// once on the fresh worker instead.

import type { GrepFile, GrepMode, GrepRequest, GrepResults } from "@/app/workers/text-grep-protocol";
import type { GrepProgress } from "@/app/workers/text-grep";

let worker: Worker | null | undefined;
let lastSearchId = 0;
let stopListening: (() => void) | null = null;

const STALL_MS = 2500;

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = typeof Worker === "undefined" ? null : new Worker(new URL("../workers/text-grep.worker.ts", import.meta.url));
  } catch {
    worker = null;
  }
  return worker;
}

export function isTextGrepAvailable(): boolean {
  return typeof Worker !== "undefined";
}

// Browsers that can't send file handles to a worker get the text instead.
async function withContent(files: GrepFile[]): Promise<GrepFile[]> {
  return Promise.all(files.map(async (file) => {
    try {
      return { path: file.path, name: file.name, isNote: file.isNote, content: await file.handle!.getFile().then((blob) => blob.text()) };
    } catch {
      return { path: file.path, name: file.name, isNote: file.isNote, content: "" };
    }
  }));
}

export function cancelTextGrep(): void {
  stopListening?.();
  stopListening = null;
  worker?.postMessage({ type: "grep:cancel" } satisfies GrepRequest);
}

// Searches `files`, calling `onProgress` as results come in. Returns a
// function that stops it. (`isRetry` is internal: see the stall note above.)
export function grepTextFiles(
  query: string,
  files: GrepFile[],
  limit: number,
  onProgress: (progress: GrepProgress) => void,
  mode: GrepMode = "text",
  isRetry = false,
): () => void {
  const target = getWorker();
  if (!target) return () => {};
  cancelTextGrep();
  const searchId = ++lastSearchId;
  let last: GrepProgress = { hits: [], scanned: 0, total: files.length, done: false };
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  let answered = false;
  let retry: (() => void) | null = null;
  const watch = () => {
    if (mode !== "regex") return;
    clearTimeout(watchdog);
    watchdog = setTimeout(() => {
      stop();
      target.terminate();
      if (worker === target) worker = undefined;
      if (!answered && !isRetry) retry = grepTextFiles(query, files, limit, onProgress, mode, true);
      else onProgress({ ...last, done: true, stalled: true });
    }, STALL_MS);
  };
  const onMessage = (event: MessageEvent) => {
    const data = event.data as GrepResults | undefined;
    if (data?.type !== "grep:results" || data.searchId !== searchId) return;
    answered = true;
    last = { hits: data.hits, scanned: data.scanned, total: data.total, done: data.done, ...(data.invalid ? { invalid: true } : {}) };
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

  const send = (payload: GrepFile[]) =>
    target.postMessage({ type: "grep:search", searchId, query, files: payload, limit, mode } satisfies GrepRequest);
  watch();
  try {
    send(files);
  } catch {
    void withContent(files).then((payload) => {
      if (stopListening === stop) send(payload);
    });
  }
  return () => {
    if (retry) retry();
    else if (stopListening === stop) cancelTextGrep();
  };
}
