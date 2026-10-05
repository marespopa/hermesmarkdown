"use client";

// Main-thread side of the note-text index, which lives in the metadata worker
// (app/workers/content-index.ts). Posts index updates and searches; never
// holds note text itself. Every call is a no-op (or an empty result) when
// the browser has no worker.

import { metadataWorker } from "@/app/hooks/file-system/shared";
import { remapPath } from "@/app/atoms/utils";
import type { ContentRequest, ContentResults } from "@/app/workers/content-search-protocol";

export interface ReadableNote {
  path: string;
  name: string;
  content: string;
  modifiedAt: number;
}

export type ContentSearchResult = Omit<ContentResults, "type" | "searchId">;

export const DEFAULT_SEARCH_LIMIT = 50;
const SEARCH_TIMEOUT_MS = 5000;

// path → modified time of the copy sent to the worker this session, so the
// warm-start backfill reads only notes the index doesn't have yet.
const indexed = new Map<string, number>();
let lastSearchId = 0;
let supersede: (() => void) | null = null;

function post(message: ContentRequest) {
  metadataWorker?.postMessage(message);
}

export function isContentSearchAvailable(): boolean {
  return metadataWorker !== null;
}

/** Records notes the worker is (or will be) indexing through a metadata parse. */
export function markContentIndexed(files: { path: string; modifiedAt: number }[]): void {
  if (!metadataWorker) return;
  for (const file of files) indexed.set(file.path, file.modifiedAt);
}

export function needsContentIndex(path: string, modifiedAt: number): boolean {
  return indexed.get(path) !== modifiedAt;
}

/** Sends note text to the index without a metadata parse. */
export function indexNoteContent(files: ReadableNote[]): void {
  if (!metadataWorker || files.length === 0) return;
  markContentIndexed(files);
  post({ type: "content:index", files });
}

export function removeNoteContent(paths: string[]): void {
  if (!metadataWorker || paths.length === 0) return;
  for (const path of paths) indexed.delete(path);
  post({ type: "content:remove", paths });
}

/** Empties the note-text index: a different vault was opened, or it closed. */
export function clearNoteContent(): void {
  indexed.clear();
  if (metadataWorker) post({ type: "content:clear" });
}

export function remapNoteContent(oldPath: string, newPath: string): void {
  if (!metadataWorker || !oldPath || !newPath || oldPath === newPath) return;
  const moved = [...indexed].filter(([path]) => remapPath(path, oldPath, newPath) !== null);
  for (const [path] of moved) indexed.delete(path);
  for (const [path, modifiedAt] of moved) indexed.set(remapPath(path, oldPath, newPath)!, modifiedAt);
  post({ type: "content:remap", oldPath, newPath });
}

// Searches the notes in `paths`. Resolves null when a newer search replaces
// this one, when the worker doesn't answer within 5 s, or without a worker.
export function searchNoteContent(
  query: string,
  paths: string[],
  limit = DEFAULT_SEARCH_LIMIT,
): Promise<ContentSearchResult | null> {
  const worker = metadataWorker;
  if (!worker) return Promise.resolve(null);
  supersede?.();
  const searchId = ++lastSearchId;

  return new Promise((resolve) => {
    const finish = (result: ContentSearchResult | null) => {
      clearTimeout(timer);
      worker.removeEventListener("message", onMessage);
      if (supersede === cancel) supersede = null;
      resolve(result);
    };
    const cancel = () => finish(null);
    const onMessage = (event: MessageEvent) => {
      const data = event.data as ContentResults | undefined;
      if (data?.type !== "content:results" || data.searchId !== searchId) return;
      finish({ hits: data.hits, pending: data.pending, capped: data.capped });
    };
    const timer = setTimeout(cancel, SEARCH_TIMEOUT_MS);
    supersede = cancel;
    worker.addEventListener("message", onMessage);
    worker.postMessage({ type: "content:search", searchId, query, paths, limit } satisfies ContentRequest);
  });
}
