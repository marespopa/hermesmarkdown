// The note-text index held in the metadata worker's heap. Pure: no DOM,
// React or Jotai, so it runs in the worker and in tests alike. Full note
// text lives only here — never in an atom.

import { parseFmFields } from "@/app/utils/frontmatter-utils";
import { isSensitiveFrontmatter } from "@/app/utils/note-privacy";
import { remapPath } from "@/app/atoms/utils";

export const REGEX_FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

/** Longer notes are indexed up to this many characters. */
export const MAX_NOTE_CHARS = 1_000_000;
/** Total indexed characters (≈64–128 MB of worker heap with the folded copy). */
export const MAX_TOTAL_CHARS = 32_000_000;

// Lowercases `text` without changing its length, so offsets found in the
// folded copy map 1:1 onto the original. Characters whose lowercase form has
// a different length (e.g. "İ") are kept as they are.
export function foldCase(text: string): string {
  const lower = text.toLowerCase();
  if (lower.length === text.length) return lower;
  let folded = "";
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    const isPair = code >= 0xd800 && code <= 0xdbff && index + 1 < text.length;
    const unit = isPair ? text.slice(index, index + 2) : text[index];
    const unitLower = unit.toLowerCase();
    folded += unitLower.length === unit.length ? unitLower : unit;
    if (isPair) index++;
  }
  return folded;
}

export interface ContentEntry {
  name: string;
  text: string;
  /** `foldCase(text)`; the same length as `text`. */
  folded: string;
  /** Offset just past the YAML frontmatter (0 without one). */
  bodyStart: number;
  sensitive: boolean;
  modifiedAt: number;
}

export interface ContentIndexOptions {
  maxNoteChars?: number;
  maxTotalChars?: number;
}

export class ContentIndex {
  private readonly entries = new Map<string, ContentEntry>();
  private readonly maxNoteChars: number;
  private readonly maxTotalChars: number;
  private totalChars = 0;
  private isCapped = false;

  constructor(options: ContentIndexOptions = {}) {
    this.maxNoteChars = options.maxNoteChars ?? MAX_NOTE_CHARS;
    this.maxTotalChars = options.maxTotalChars ?? MAX_TOTAL_CHARS;
  }

  /** True once a note was left out because the total size cap was reached. */
  get capped(): boolean {
    return this.isCapped;
  }

  get size(): number {
    return this.entries.size;
  }

  // Stores a note's text. A copy older than the stored one is ignored (the
  // active tab's unsaved text beats a stale disk read).
  upsert(path: string, name: string, content: string, modifiedAt: number): void {
    const existing = this.entries.get(path);
    if (existing && modifiedAt < existing.modifiedAt) return;
    const text = content.length > this.maxNoteChars ? content.slice(0, this.maxNoteChars) : content;
    const base = this.totalChars - (existing?.text.length ?? 0);
    if (base + text.length > this.maxTotalChars) {
      // Better unsearchable than searchable with stale text.
      this.remove([path]);
      this.isCapped = true;
      return;
    }
    const frontmatter = REGEX_FRONTMATTER.exec(text);
    this.entries.set(path, {
      name,
      text,
      folded: foldCase(text),
      bodyStart: frontmatter ? frontmatter[0].length : 0,
      sensitive: frontmatter ? isSensitiveFrontmatter(parseFmFields(text)) : false,
      modifiedAt,
    });
    this.totalChars = base + text.length;
  }

  remove(paths: string[]): void {
    for (const path of paths) {
      const entry = this.entries.get(path);
      if (!entry) continue;
      this.totalChars -= entry.text.length;
      this.entries.delete(path);
    }
    // An emptied index (vault closed or switched) starts over.
    if (this.entries.size === 0) {
      this.totalChars = 0;
      this.isCapped = false;
    }
  }

  // Follows a renamed or moved file, or a folder and everything under it.
  remap(oldPath: string, newPath: string): void {
    if (!oldPath || !newPath || oldPath === newPath) return;
    const moved: [string, ContentEntry][] = [];
    for (const [path, entry] of this.entries) {
      const target = remapPath(path, oldPath, newPath);
      if (target !== null) moved.push([target, entry]);
    }
    for (const [target] of moved) {
      // The source keys are removed below; drop whatever already sat at a target.
      const replaced = this.entries.get(target);
      if (replaced && !moved.some(([, entry]) => entry === replaced)) this.totalChars -= replaced.text.length;
    }
    for (const [path] of [...this.entries]) {
      if (remapPath(path, oldPath, newPath) !== null) this.entries.delete(path);
    }
    for (const [target, entry] of moved) {
      this.entries.set(target, { ...entry, name: target.split("/").pop() || entry.name });
    }
  }

  get(path: string): ContentEntry | undefined {
    return this.entries.get(path);
  }

  has(path: string): boolean {
    return this.entries.has(path);
  }
}
