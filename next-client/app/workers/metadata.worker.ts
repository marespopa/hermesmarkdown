// app/workers/metadata.worker.ts
import { ContentIndex } from "./content-index";
import { handleContentMessage } from "./content-search";
import { parseNoteFile } from "./parse-note";

// The note-text index (worker heap only): filled from every parse below and
// from `content:index` messages; queried with `content:search`.
const contentIndex = new ContentIndex();

self.onmessage = (event: MessageEvent) => {
  // Typed messages belong to the note-text index; replies carry no
  // `results` / `requestId`, so the parse listeners ignore them.
  if (handleContentMessage(contentIndex, event.data, (message) => self.postMessage(message))) return;

  // Expects array of { path, name, content, modifiedAt } — content pre-read in main thread
  const { files } = event.data;

  if (!files || !Array.isArray(files)) return;

  const results = [];

  for (const fileInfo of files) {
    try {
      results.push(parseNoteFile(fileInfo));
      // The index strips board JSON itself (ContentIndex.upsert).
      contentIndex.upsert(fileInfo.path, fileInfo.name, fileInfo.content, fileInfo.modifiedAt);
    } catch (err: any) {
      console.error(`Worker error processing file (${fileInfo.path}):`, err?.message || err);
    }
  }

  // `requestId` lets the vault indexer match results to its request
  // (parseWithWorker); the active-file re-indexer posts without one.
  self.postMessage({ results, requestId: event.data.requestId });
};
