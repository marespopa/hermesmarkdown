// The vault indexing pipeline, tuned for large vaults. It streams: the vault
// walk hands over each folder's notes as soon as that folder is listed
// (`add`), so notes show up while the walk is still running.
//
// 1. Cache load: the IndexedDB cache starts loading as the run starts, in
//    parallel with the walk.
// 2. Stat: each batch's modified times are read (no content), so the home
//    feed orders notes correctly as they arrive.
// 3. Reuse: notes whose modified time matches the cache (or the in-memory
//    entry from an earlier pass) keep their parsed metadata and are never
//    read.
// 4. Merge: stat'ed batches and parse results are merged into the metadata
//    atom at most every FLUSH_INTERVAL_MS, so a big vault doesn't re-render
//    the feed once per folder.
// 5. Parse the rest newest first (of what's queued so far), in chunks.
// 6. Once the walk is over (`complete`): notes no longer listed drop out,
//    parsing finishes and the complete index is saved back to the cache.
// 7. Note-text backfill: notes reused in step 3 were never read, so the
//    worker's note-text index doesn't have them. After `done`, read just
//    those (newest first) and hand them to `indexContent`. Each note is read
//    at most once per session for indexing; cold starts add no reads.
//
// Dependencies are injected so the pipeline runs without a worker or
// IndexedDB in tests.

import toast from "react-hot-toast";
import type { CachedMetadata } from "@/app/services/metadata-cache";
import type { CollectedFile } from "./vault-scan";

export interface StatFile extends CollectedFile {
  /** 0 when the file couldn't be stat'ed. */
  modifiedAt: number;
}

export interface ReadableFile {
  path: string;
  name: string;
  content: string;
  modifiedAt: number;
}

type Metadata = Record<string, any>;

export interface VaultIndexDeps {
  loadCache: () => Promise<Record<string, CachedMetadata> | null>;
  saveCache: (entries: Record<string, CachedMetadata>) => Promise<void>;
  read: (files: CollectedFile[]) => Promise<ReadableFile[]>;
  parse: (files: ReadableFile[]) => Promise<CachedMetadata[]>;
  setMetadata: (update: (prev: Metadata) => Metadata) => void;
  /** False once a newer indexing run has started; this one then stops quietly. */
  isCurrent: () => boolean;
  chunkSize?: number;
  /** Minimum time between merges into the metadata atom. */
  flushIntervalMs?: number;
  /** True when the note-text index lacks this note at this modified time. */
  needsContent?: (path: string, modifiedAt: number) => boolean;
  /** Sends read notes to the note-text index (backfill only). */
  indexContent?: (files: ReadableFile[]) => void;
}

export interface VaultIndexer {
  /** Notes found by the walk; stat'ed, merged and queued for parsing. */
  add: (files: CollectedFile[]) => void;
  /**
   * The walk is over and `files` is everything it found (notes it never
   * passed to `add` are added now). `done` settles once every note is
   * parsed and the cache saved; `contentDone` after the backfill.
   */
  complete: (files: CollectedFile[]) => { done: Promise<void>; contentDone: Promise<void> };
}

const STAT_CHUNK_SIZE = 200;
const PARSE_CHUNK_SIZE = 100;
const FLUSH_INTERVAL_MS = 150;
const EMPTY_METADATA = { tags: [], links: [], frontmatter: {}, modifiedAt: 0, wordCount: 0, tasks: [] };

export async function statFiles(files: CollectedFile[], chunkSize = STAT_CHUNK_SIZE): Promise<StatFile[]> {
  const stats: StatFile[] = [];
  for (let start = 0; start < files.length; start += chunkSize) {
    const chunk = await Promise.all(
      files.slice(start, start + chunkSize).map(async (file) => {
        try {
          return { ...file, modifiedAt: (await file.handle.getFile()).lastModified };
        } catch {
          return { ...file, modifiedAt: 0 };
        }
      }),
    );
    stats.push(...chunk);
  }
  return stats;
}

// Parsed metadata that's still valid for this file: the cache entry, or the
// in-memory entry from an earlier pass, when parsed at the same modified time.
export function reusableEntry(
  stat: StatFile,
  cache: Record<string, CachedMetadata> | null,
  previous: Metadata | undefined,
): CachedMetadata | null {
  if (stat.modifiedAt <= 0) return null;
  const cached = cache?.[stat.path];
  if (cached && cached.modifiedAt === stat.modifiedAt) return cached;
  const prior = previous?.[stat.path];
  if (prior && prior.preview !== undefined && prior.modifiedAt === stat.modifiedAt) {
    return withoutHandle(prior);
  }
  return null;
}

function withoutHandle(entry: Metadata): CachedMetadata {
  const rest = { ...entry };
  delete rest.handle;
  return rest as CachedMetadata;
}

const newestFirst = (a: { modifiedAt: number; path: string }, b: { modifiedAt: number; path: string }) =>
  b.modifiedAt - a.modifiedAt || a.path.localeCompare(b.path);

// Starts an indexing run. Fresh vault opens replace the old vault's entries
// on the first merge; re-index passes keep earlier parses until the new ones
// land and drop removed files once the walk is over.
export function startVaultIndex(fresh: boolean, deps: VaultIndexDeps): VaultIndexer {
  const chunkSize = deps.chunkSize ?? PARSE_CHUNK_SIZE;
  const flushIntervalMs = deps.flushIntervalMs ?? FLUSH_INTERVAL_MS;
  const cacheLoad = deps.loadCache().catch(() => null);

  const handles = new Map<string, FileSystemFileHandle>();
  const reusable = new Map<string, CachedMetadata>();
  const parsedEntries: Record<string, CachedMetadata> = {};
  const statWork: Promise<void>[] = [];
  const parseQueue: StatFile[] = [];
  let pendingStats: StatFile[] = [];
  let pendingResults: CachedMetadata[] = [];
  let replacedOld = !fresh;
  let lastFlush = 0;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let parsing: Promise<void> | null = null;
  let parseError: unknown = null;
  let cache: Record<string, CachedMetadata> | null = null;

  // Merges what's pending: stat'ed notes (reused parses as-is, the rest with
  // their real modified time and any earlier parse kept until the new one
  // lands), then parse results for notes still listed.
  function flush() {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = null;
    lastFlush = Date.now();
    if (!deps.isCurrent() || (pendingStats.length === 0 && pendingResults.length === 0)) return;
    const stats = pendingStats;
    const results = pendingResults;
    pendingStats = [];
    pendingResults = [];
    const toParse = new Map<string, StatFile>();
    deps.setMetadata((prev) => {
      const previous = fresh ? undefined : prev;
      const next: Metadata = replacedOld ? { ...prev } : {};
      for (const stat of stats) {
        const reuse = reusableEntry(stat, cache, previous);
        if (reuse) {
          reusable.set(stat.path, reuse);
          next[stat.path] = { ...reuse, path: stat.path, name: stat.handle.name, handle: stat.handle };
        } else {
          toParse.set(stat.path, stat);
          const prior = previous?.[stat.path];
          next[stat.path] = {
            ...(prior || EMPTY_METADATA),
            path: stat.path,
            name: stat.handle.name,
            handle: stat.handle,
            modifiedAt: stat.modifiedAt || prior?.modifiedAt || 0,
          };
        }
      }
      for (const result of results) {
        const handle = handles.get(result.path);
        if (handle && next[result.path]) next[result.path] = { ...result, handle };
      }
      return next;
    });
    replacedOld = true;
    if (toParse.size > 0) {
      parseQueue.push(...toParse.values());
      startParsing();
    }
  }

  // The first merge goes out at once; later ones at most every interval.
  function scheduleFlush() {
    if (flushTimer) return;
    const wait = lastFlush + flushIntervalMs - Date.now();
    if (wait <= 0) flush();
    else flushTimer = setTimeout(() => flush(), wait);
  }

  async function parseLoop() {
    while (parseQueue.length > 0 && deps.isCurrent()) {
      parseQueue.sort(newestFirst);
      const readable = await deps.read(parseQueue.splice(0, chunkSize));
      if (!deps.isCurrent()) return;
      const results = await deps.parse(readable);
      if (!deps.isCurrent()) return;
      for (const result of results) parsedEntries[result.path] = withoutHandle(result);
      pendingResults.push(...results);
      scheduleFlush();
    }
  }

  function startParsing() {
    if (parsing || parseError) return;
    parsing = parseLoop()
      .catch((err) => { parseError = err; })
      .finally(() => {
        parsing = null;
        // Notes queued while the loop was winding down.
        if (parseQueue.length > 0 && deps.isCurrent()) startParsing();
      });
  }

  function add(files: CollectedFile[]) {
    const unseen = files.filter((file) => !handles.has(file.path));
    if (unseen.length === 0 || !deps.isCurrent()) return;
    for (const file of unseen) handles.set(file.path, file.handle);
    statWork.push((async () => {
      const [stats, loaded] = await Promise.all([statFiles(unseen), cacheLoad]);
      cache = loaded;
      if (!deps.isCurrent()) return;
      pendingStats.push(...stats);
      scheduleFlush();
    })());
  }

  function complete(files: CollectedFile[]) {
    add(files);
    const listed = new Set(files.map((file) => file.path));

    const done = (async () => {
      await Promise.all(statWork);
      if (!deps.isCurrent()) return;
      flush();
      // Notes gone from disk (or, on a fresh open of an empty vault, the old
      // vault's) drop out now that the walk has listed everything.
      deps.setMetadata((prev) => {
        const kept = Object.keys(prev).filter((path) => listed.has(path));
        if (replacedOld && kept.length === Object.keys(prev).length) return prev;
        return Object.fromEntries(kept.map((path) => [path, prev[path]]));
      });
      replacedOld = true;
      while (parsing) await parsing;
      if (parseError) throw parseError;
      if (!deps.isCurrent()) return;
      flush();
      const index: Record<string, CachedMetadata> = {};
      for (const path of listed) {
        const entry = parsedEntries[path] ?? reusable.get(path);
        if (entry) index[path] = entry;
      }
      await deps.saveCache(index);
    })();

    // Runs after the metadata pass even if it failed (its error is reported
    // through `done`), so it never competes with parsing for reads.
    const contentDone = done.catch(() => undefined).then(async () => {
      const { needsContent, indexContent } = deps;
      if (!needsContent || !indexContent || !deps.isCurrent()) return;
      const backfill = [...reusable.values()]
        .filter((entry) => listed.has(entry.path) && !parsedEntries[entry.path] && needsContent(entry.path, entry.modifiedAt))
        .sort(newestFirst)
        .map((entry) => ({ path: entry.path, handle: handles.get(entry.path)! }));
      for (let start = 0; start < backfill.length && deps.isCurrent(); start += chunkSize) {
        const readable = await deps.read(backfill.slice(start, start + chunkSize));
        if (!deps.isCurrent()) return;
        indexContent(readable);
      }
    });

    return { done, contentDone };
  }

  return { add, complete };
}

let nextRequestId = 0;

// Sends notes to the metadata worker and resolves with its results for this
// request (matched by id, so concurrent requests don't mix). Resolves empty
// after `timeoutMs` if the worker never answers.
export function parseWithWorker(worker: Worker, files: ReadableFile[], timeoutMs = 30000): Promise<CachedMetadata[]> {
  if (files.length === 0) return Promise.resolve([]);
  const requestId = ++nextRequestId;
  return new Promise((resolve) => {
    const finish = (results: CachedMetadata[]) => {
      clearTimeout(timer);
      worker.removeEventListener("message", onMessage);
      resolve(results);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.data?.requestId === requestId) finish(event.data.results ?? []);
    };
    const timer = setTimeout(() => finish([]), timeoutMs);
    worker.addEventListener("message", onMessage);
    worker.postMessage({ files, requestId });
  });
}

// Tells the user when the vault walk was cut short or some folders were unreadable.
export function reportCollectProblems(timedOut: boolean, failedSubdirs: number) {
  if (timedOut) {
    toast.error(
      "Indexing is taking a while — some folders may be very large. Showing what we found so far.",
      { id: "index-timeout", duration: 6000 },
    );
  }
  if (failedSubdirs > 0) {
    toast.error(
      `Could not read ${failedSubdirs} subfolder(s). Grant full folder access and re-open the vault.`,
      { id: "subdir-access-error", duration: 6000 },
    );
  }
}
