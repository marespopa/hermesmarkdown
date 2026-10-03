// The vault indexing pipeline, tuned for large vaults:
//
// 1. Stat pass: read every note's modified time (no content), so the home
//    feed can order the vault correctly within moments.
// 2. Reuse: notes whose modified time matches the IndexedDB cache (or the
//    in-memory entry from an earlier pass) keep their parsed metadata and
//    are never read.
// 3. Parse the rest newest first, in chunks, merging each chunk as it lands,
//    so the notes you see first get their previews first.
// 4. Save the complete index back to the cache.
// 5. Note-text backfill: notes reused in step 2 were never read, so the
//    worker's note-text index doesn't have them. After `done`, read just
//    those (newest first) and hand them to `indexContent`. Each note is read
//    at most once per session for indexing; cold starts add no reads.
//
// Dependencies are injected so the pipeline runs without a worker or
// IndexedDB in tests. `indexVaultFiles` resolves once step 2 has been merged;
// parsing continues in `done`, the backfill in `contentDone`.

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
  /** True when the note-text index lacks this note at this modified time. */
  needsContent?: (path: string, modifiedAt: number) => boolean;
  /** Sends read notes to the note-text index (backfill only). */
  indexContent?: (files: ReadableFile[]) => void;
}

const STAT_CHUNK_SIZE = 200;
const PARSE_CHUNK_SIZE = 100;
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

export async function indexVaultFiles(
  files: CollectedFile[],
  fresh: boolean,
  deps: VaultIndexDeps,
): Promise<{ done: Promise<void>; contentDone: Promise<void> }> {
  const idle = { done: Promise.resolve(), contentDone: Promise.resolve() };
  const stats = await statFiles(files);
  if (!deps.isCurrent()) return idle;
  const cache = await deps.loadCache();
  if (!deps.isCurrent()) return idle;

  // Every listed note gets an entry now: reusable parses as-is, the rest
  // with their real modified time (so ordering is right immediately) and
  // any earlier parse kept until the new one lands. Fresh vault opens start
  // from scratch; re-index passes keep earlier parses and drop removed files.
  const reusable = new Map<string, CachedMetadata>();
  deps.setMetadata((prev) => {
    const previous = fresh ? undefined : prev;
    const next: Metadata = {};
    for (const stat of stats) {
      const reuse = reusableEntry(stat, cache, previous);
      if (reuse) {
        reusable.set(stat.path, reuse);
        next[stat.path] = { ...reuse, path: stat.path, name: stat.handle.name, handle: stat.handle };
      } else {
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
    return next;
  });

  const toParse = stats
    .filter((stat) => !reusable.has(stat.path))
    .sort((a, b) => b.modifiedAt - a.modifiedAt || a.path.localeCompare(b.path));
  const handles = new Map(stats.map((stat) => [stat.path, stat.handle]));
  const chunkSize = deps.chunkSize ?? PARSE_CHUNK_SIZE;

  const done = (async () => {
    const complete: Record<string, CachedMetadata> = Object.fromEntries(reusable);
    for (let start = 0; start < toParse.length; start += chunkSize) {
      const readable = await deps.read(toParse.slice(start, start + chunkSize));
      if (!deps.isCurrent()) return;
      const results = await deps.parse(readable);
      if (!deps.isCurrent()) return;
      deps.setMetadata((prev) => {
        const next = { ...prev };
        for (const result of results) {
          const handle = handles.get(result.path);
          if (handle && next[result.path]) next[result.path] = { ...result, handle };
        }
        return next;
      });
      for (const result of results) complete[result.path] = withoutHandle(result);
    }
    if (deps.isCurrent()) await deps.saveCache(complete);
  })();

  // Runs after the metadata pass even if it failed (its error is reported
  // through `done`), so it never competes with parsing for reads.
  const contentDone = done.catch(() => undefined).then(async () => {
    const { needsContent, indexContent } = deps;
    if (!needsContent || !indexContent || !deps.isCurrent()) return;
    const backfill = stats
      .filter((stat) => reusable.has(stat.path) && needsContent(stat.path, stat.modifiedAt))
      .sort((a, b) => b.modifiedAt - a.modifiedAt || a.path.localeCompare(b.path));
    for (let start = 0; start < backfill.length && deps.isCurrent(); start += chunkSize) {
      const readable = await deps.read(backfill.slice(start, start + chunkSize));
      if (!deps.isCurrent()) return;
      indexContent(readable);
    }
  });

  return { done, contentDone };
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
