import type { FileMetadata } from "@/app/atoms/metadata";
import { isPrivateFrontmatter } from "@/app/utils/note-privacy";

// What the frontmatter completion menu offers (codemirror/frontmatter-completion.ts),
// read from the vault's notes: the keys they use, their tags, and the short
// values other keys repeat (`status: draft`). Private notes are left out.

export interface FrontmatterVocabulary {
  // The common keys, then the rest the vault uses, most used first.
  keys: string[];
  tags: string[];
  // Per key, its values most used first: only short one-word values, so
  // titles, sentences and dates aren't offered back.
  values: Record<string, string[]>;
}

export const COMMON_KEYS = ["title", "description", "tags", "aliases", "status", "created"];
// Keys whose values are free text or lists, never offered as values.
const FREE_KEYS = new Set(["title", "description", "tags", "aliases", "summary"]);
const VALUE_LIMIT = 20;
const SHORT_VALUE = /^[\p{L}\p{N}_-]{1,32}$/u;
const DATE_LIKE = /^\d{4}-\d{2}/;

function ranked(counts: Map<string, number>, limit?: number): string[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value]) => value);
}

function count(counts: Map<string, number>, value: string) {
  counts.set(value, (counts.get(value) ?? 0) + 1);
}

export function buildFrontmatterVocabulary(files: FileMetadata[]): FrontmatterVocabulary {
  const keyCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  const valueCounts = new Map<string, Map<string, number>>();
  for (const file of files) {
    if (isPrivateFrontmatter(file.frontmatter)) continue;
    for (const tag of file.tags ?? []) count(tagCounts, tag);
    for (const [key, raw] of Object.entries(file.frontmatter ?? {})) {
      count(keyCounts, key);
      const value = typeof raw === "string" ? raw.trim() : "";
      if (FREE_KEYS.has(key) || !SHORT_VALUE.test(value) || DATE_LIKE.test(value)) continue;
      if (!valueCounts.has(key)) valueCounts.set(key, new Map());
      count(valueCounts.get(key)!, value);
    }
  }
  const used = ranked(keyCounts);
  const values: Record<string, string[]> = {};
  for (const [key, counts] of valueCounts) values[key] = ranked(counts, VALUE_LIMIT);
  return {
    keys: [...new Set([...COMMON_KEYS, ...used])],
    tags: ranked(tagCounts),
    values,
  };
}

// The vocabulary for the vault's index, built once per index (the menu asks
// on every key press).
const byIndex = new WeakMap<Record<string, FileMetadata>, FrontmatterVocabulary>();

export function frontmatterVocabularyOf(index: Record<string, FileMetadata>): FrontmatterVocabulary {
  let vocabulary = byIndex.get(index);
  if (!vocabulary) {
    vocabulary = buildFrontmatterVocabulary(Object.values(index));
    byIndex.set(index, vocabulary);
  }
  return vocabulary;
}
