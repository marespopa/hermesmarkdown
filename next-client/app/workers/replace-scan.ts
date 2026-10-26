// The Replace in Files scan: reads each file's raw text (notes with their
// frontmatter; board JSON never matched), finds every match of the query and
// reports per-file matches as it goes. Same shape as grepFiles (8 concurrent
// reads, short slices, a report every 120 ms) but on the file as saved, so
// offsets can be written back. Pure apart from reading the files.
import { boardFenceRanges } from "@/app/utils/board/board-format";
import { isMarkdownPath } from "@/app/utils/file-kinds";
import { MAX_TOTAL_CHARS } from "./content-index";
import { buildReplacePattern, findMatches, MAX_PREVIEW_MATCHES, textFingerprint, type ReplaceQuery } from "./replace-search";
import { readFileText, TextCache, type CachedFile } from "./text-cache";
import type { GrepFile, ReplaceFileResult, ReplaceScanResults } from "./text-grep-protocol";

const READ_CONCURRENCY = 8;
const REPORT_EVERY_MS = 120;
const SLICE_MS = 8;

export type ReplaceProgress = Omit<ReplaceScanResults, "type" | "scanId">;

// Raw text, kept between scans (typing re-scans without reading again).
const cache = new TextCache<CachedFile>(MAX_TOTAL_CHARS);

export function clearReplaceCache(): void {
  cache.clear();
}

const readRaw = (file: GrepFile) =>
  readFileText(file, cache, (text, modified, size) => ({ modified, size, checkedAt: Date.now(), text }));

// Calls `report` with the files finished since the last report (at most every
// 120 ms, and at the end). Stops early, without a final report, once
// `isCancelled` says so.
export async function scanForReplace(
  files: GrepFile[],
  query: ReplaceQuery,
  report: (progress: ReplaceProgress) => void,
  isCancelled: () => boolean,
): Promise<void> {
  const pattern = buildReplacePattern(query);
  if (!pattern) {
    report({ files: [], scanned: 0, total: files.length, matchCount: 0, done: true, ...(query.find ? { invalid: true } : {}) });
    return;
  }
  let pending: ReplaceFileResult[] = [];
  let scanned = 0;
  let matchCount = 0;
  let capped = false;
  let next = 0;
  let lastReport = Date.now();
  let sliceStart = Date.now();
  const flush = (done: boolean) => {
    const batch = pending;
    pending = [];
    report({ files: batch, scanned, total: files.length, matchCount, done, ...(capped ? { capped: true } : {}) });
  };

  const worker = async () => {
    while (next < files.length && !capped && !isCancelled()) {
      const file = files[next++];
      try {
        const entry = await readRaw(file);
        if (entry && !capped) {
          const exclude = isMarkdownPath(file.path) ? boardFenceRanges(entry.text) : [];
          const matches = findMatches(entry.text, pattern, exclude, MAX_PREVIEW_MATCHES + 1 - matchCount);
          const kept = Math.min(matches.length, MAX_PREVIEW_MATCHES - matchCount);
          if (matches.length > kept) capped = true;
          if (kept > 0) {
            matchCount += kept;
            pending.push({ path: file.path, fingerprint: textFingerprint(entry.text), matches: matches.slice(0, kept) });
          }
        }
      } catch {
        // Gone or unreadable since the vault was listed: skip it.
      }
      scanned++;
      if (Date.now() - sliceStart >= SLICE_MS) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        sliceStart = Date.now();
      }
      if (!capped && Date.now() - lastReport >= REPORT_EVERY_MS && !isCancelled()) {
        lastReport = Date.now();
        flush(false);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(READ_CONCURRENCY, files.length) }, worker));
  if (!isCancelled()) flush(true);
}
