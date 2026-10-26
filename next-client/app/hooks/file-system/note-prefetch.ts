// Starts reading a note before the click: when it's highlighted in the
// command palette or the pointer rests on its sidebar row, its text goes
// into a small in-memory cache with the file's modified time and size.
// openFile (use-open-file.ts) takes the cached text only when the file on
// disk still has that time and size, so a stale copy is never shown (disk
// wins). Prefetching changes nothing on screen.
// - One read at a time: a newer target waits for the running one, whose
//   result is then dropped; only the newest waiting target runs.
// - Only small files, a few of them, and nothing while the user is typing.

export const PREFETCH_MAX_ENTRIES = 8;
// Total cached text (characters), and the largest file read ahead (bytes).
export const PREFETCH_MAX_TOTAL_CHARS = 8_000_000;
export const PREFETCH_MAX_FILE_BYTES = 2_000_000;
// No prefetch until typing has paused this long (ms).
export const PREFETCH_TYPING_QUIET_MS = 800;

interface Entry {
  text: string;
  lastModified: number;
  size: number;
}

interface Target {
  path: string;
  handle: FileSystemFileHandle;
}

const cache = new Map<string, Entry>();
let running: string | null = null;
let waiting: Target | null = null;
let lastTypedAt = Number.NEGATIVE_INFINITY;

const now = () => Date.now();

/** The user typed: prefetching pauses for a moment. */
export function noteTyped(): void {
  lastTypedAt = now();
}

/** Reads `path` ahead of an open, unless it's cached, too big, or the user is typing. */
export function prefetchNote(path: string, handle: FileSystemFileHandle): void {
  if (now() - lastTypedAt < PREFETCH_TYPING_QUIET_MS) return;
  if (cache.has(path) || running === path) return;
  if (running) {
    waiting = { path, handle };
    return;
  }
  void run({ path, handle });
}

async function run({ path, handle }: Target): Promise<void> {
  running = path;
  try {
    const file = await handle.getFile();
    if (file.size > PREFETCH_MAX_FILE_BYTES || waiting) return;
    const text = await file.text();
    // A newer target came in meanwhile: this one is no longer wanted.
    if (waiting) return;
    remember(path, { text, lastModified: file.lastModified, size: file.size });
  } catch {
    // Gone or unreadable: the open will say so.
  } finally {
    running = null;
    const next = waiting;
    waiting = null;
    if (next) prefetchNote(next.path, next.handle);
  }
}

function remember(path: string, entry: Entry) {
  cache.delete(path);
  cache.set(path, entry);
  let total = 0;
  for (const value of cache.values()) total += value.text.length;
  // Oldest first (a Map keeps insertion order).
  for (const [key, value] of cache) {
    if (cache.size <= PREFETCH_MAX_ENTRIES && total <= PREFETCH_MAX_TOTAL_CHARS) break;
    cache.delete(key);
    total -= value.text.length;
  }
}

/**
 * The prefetched text of `path` if `file` (just read from its handle) is
 * still the version that was read; null otherwise. Taken once.
 */
export function takePrefetched(path: string, file: Pick<File, "lastModified" | "size">): string | null {
  const entry = cache.get(path);
  if (!entry) return null;
  cache.delete(path);
  return entry.lastModified === file.lastModified && entry.size === file.size ? entry.text : null;
}

/** Tests: forget everything. */
export function resetPrefetch(): void {
  cache.clear();
  running = null;
  waiting = null;
  lastTypedAt = Number.NEGATIVE_INFINITY;
}
