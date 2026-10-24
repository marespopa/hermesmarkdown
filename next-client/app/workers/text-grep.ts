// The text-file grep: reads each file (skipping large or binary ones),
// ranks its lines with the text search's scoring (content-search.ts), or
// with a regex (regex-search.ts), and reports the best hits as it goes.
// Pure apart from reading the files.
//
// Read text is kept between searches, so typing doesn't read the files
// again: a file is re-read only when its modified time or size changed, and
// isn't even checked again within 2 s of the last check (one burst of
// typing). The cache is bounded like the note-text index.
import { foldCase, MAX_NOTE_CHARS, MAX_TOTAL_CHARS, REGEX_FRONTMATTER } from "./content-index";
import { parseContentQuery, rankText, type RankedNote } from "./content-search";
import { parseRegexQuery, rankRegex } from "./regex-search";
import type { ContentHit } from "./content-search-protocol";
import type { GrepFile, GrepMode } from "./text-grep-protocol";
import { stripBoardFence } from "@/app/utils/board/board-format";

const READ_CONCURRENCY = 8;
const REPORT_EVERY_MS = 120;
const RECHECK_MS = 2000;
// Cached files are searched without any real await; yield this often so a
// newer search (or a cancel) gets through at once.
const SLICE_MS = 8;

export interface GrepProgress {
  hits: ContentHit[];
  scanned: number;
  total: number;
  done: boolean;
  /** Regex mode: the query isn't a valid pattern. */
  invalid?: boolean;
  /** The search was stopped because the pattern ran too long (set by the client). */
  stalled?: boolean;
}

interface CachedText {
  modified: number;
  size: number;
  checkedAt: number;
  text: string;
  folded?: string;
  bodyStart: number;
}

const cache = new Map<string, CachedText>();
let cachedChars = 0;

export function clearGrepCache(): void {
  cache.clear();
  cachedChars = 0;
}

function remember(path: string, entry: CachedText) {
  const previous = cache.get(path);
  if (previous) {
    cachedChars -= previous.text.length;
    cache.delete(path);
  }
  if (entry.text.length > MAX_TOTAL_CHARS) return;
  // Oldest first (Map order) until it fits.
  for (const [oldPath, old] of cache) {
    if (cachedChars + entry.text.length <= MAX_TOTAL_CHARS) break;
    cachedChars -= old.text.length;
    cache.delete(oldPath);
  }
  cache.set(path, entry);
  cachedChars += entry.text.length;
}

function toEntry(file: GrepFile, text: string, modified: number, size: number): CachedText {
  // Notes search their body only, with board JSON blanked (as indexed).
  const body = file.isNote ? stripBoardFence(text) : text;
  const frontmatter = file.isNote ? REGEX_FRONTMATTER.exec(body) : null;
  return { modified, size, checkedAt: Date.now(), text: body, bodyStart: frontmatter ? frontmatter[0].length : 0 };
}

async function readText(file: GrepFile): Promise<CachedText | null> {
  if (file.content !== undefined) return toEntry(file, file.content, 0, file.content.length);
  if (!file.handle) return null;
  const cached = cache.get(file.path);
  if (cached && Date.now() - cached.checkedAt < RECHECK_MS) return cached;
  const blob = await file.handle.getFile();
  if (cached && cached.modified === blob.lastModified && cached.size === blob.size) {
    cached.checkedAt = Date.now();
    return cached;
  }
  if (blob.size > MAX_NOTE_CHARS) return null;
  const text = await blob.text();
  // A NUL in the first 8 KB: a binary file with a text-like name.
  if (text.slice(0, 8192).includes("\u0000")) return null;
  const entry = toEntry(file, text, blob.lastModified, blob.size);
  remember(file.path, entry);
  return entry;
}

function topHits(ranked: RankedNote[], limit: number): ContentHit[] {
  return [...ranked]
    .sort((a, b) => b.score - a.score || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .flatMap((note) => note.hits)
    .slice(0, limit);
}

function matcher(query: string, mode: GrepMode): ((file: GrepFile, entry: CachedText) => RankedNote | null) | null {
  if (mode === "regex") {
    const regex = parseRegexQuery(query);
    return regex && ((file, entry) => rankRegex(file.path, { text: entry.text, bodyStart: entry.bodyStart, name: file.name }, regex));
  }
  const parsed = parseContentQuery(query);
  return parsed && ((file, entry) => {
    entry.folded ??= foldCase(entry.text);
    return rankText(file.path, { text: entry.text, folded: entry.folded, bodyStart: entry.bodyStart, name: file.name }, parsed);
  });
}

// Calls `report` with the best hits so far (at most every 120 ms, and at the
// end). Stops early, without a final report, once `isCancelled` says so.
export async function grepFiles(
  files: GrepFile[],
  query: string,
  limit: number,
  report: (progress: GrepProgress) => void,
  isCancelled: () => boolean,
  mode: GrepMode = "text",
): Promise<void> {
  const rank = matcher(query, mode);
  const ranked: RankedNote[] = [];
  let scanned = 0;
  let next = 0;
  let lastReport = Date.now();
  let sliceStart = Date.now();
  if (!rank) {
    report({ hits: [], scanned: 0, total: files.length, done: true, ...(mode === "regex" && query.trim() ? { invalid: true } : {}) });
    return;
  }

  const worker = async () => {
    while (next < files.length && !isCancelled()) {
      const file = files[next++];
      try {
        const entry = await readText(file);
        const note = entry && rank(file, entry);
        if (note) ranked.push(note);
      } catch {
        // Gone or unreadable since the vault was listed: skip it.
      }
      scanned++;
      if (Date.now() - sliceStart >= SLICE_MS) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        sliceStart = Date.now();
      }
      if (Date.now() - lastReport >= REPORT_EVERY_MS && !isCancelled()) {
        lastReport = Date.now();
        report({ hits: topHits(ranked, limit), scanned, total: files.length, done: false });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(READ_CONCURRENCY, files.length) }, worker));
  if (!isCancelled()) report({ hits: topHits(ranked, limit), scanned, total: files.length, done: true });
}
