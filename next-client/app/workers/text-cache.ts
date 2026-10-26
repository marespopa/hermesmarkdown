// A bounded path → text cache shared by the text-grep and replace scans.
// A file is re-read only when its modified time or size changed, and isn't
// even checked again within 2 s of the last check (one burst of typing).
import { MAX_NOTE_CHARS, MAX_TOTAL_CHARS } from "./content-index";
import type { GrepFile } from "./text-grep-protocol";

const RECHECK_MS = 2000;

export interface CachedFile {
  modified: number;
  size: number;
  checkedAt: number;
  text: string;
}

export class TextCache<T extends { text: string }> {
  private entries = new Map<string, T>();
  private chars = 0;

  constructor(private maxChars: number = MAX_TOTAL_CHARS) {}

  get(path: string): T | undefined {
    return this.entries.get(path);
  }

  set(path: string, entry: T): void {
    const previous = this.entries.get(path);
    if (previous) {
      this.chars -= previous.text.length;
      this.entries.delete(path);
    }
    if (entry.text.length > this.maxChars) return;
    // Oldest first (Map order) until it fits.
    for (const [oldPath, old] of this.entries) {
      if (this.chars + entry.text.length <= this.maxChars) break;
      this.chars -= old.text.length;
      this.entries.delete(oldPath);
    }
    this.entries.set(path, entry);
    this.chars += entry.text.length;
  }

  clear(): void {
    this.entries.clear();
    this.chars = 0;
  }
}

/** Reads a file's text through `cache`; null when it has no source, is over 1M characters or looks binary. */
export async function readFileText<T extends CachedFile>(
  file: GrepFile,
  cache: TextCache<T>,
  toEntry: (raw: string, modified: number, size: number) => T,
): Promise<T | null> {
  if (file.content !== undefined) return toEntry(file.content, 0, file.content.length);
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
  const entry = toEntry(text, blob.lastModified, blob.size);
  cache.set(file.path, entry);
  return entry;
}
