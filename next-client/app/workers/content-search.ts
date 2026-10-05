// Note-text search over the worker's ContentIndex: case-insensitive AND
// matching of whitespace-separated terms (plain substrings, no fuzzy or
// regex syntax), line ranking, snippets and highlight offsets. Pure.

import { ContentIndex, foldCase } from "./content-index";
import type { ContentHit, ContentRequest, ContentResults } from "./content-search-protocol";

export const MIN_QUERY_CHARS = 2;
export const MAX_HITS_PER_NOTE = 3;
export const SNIPPET_CHARS = 140;
const SNIPPET_LEAD = 40;
const MAX_OCCURRENCES_PER_NOTE = 200;
const HEADING_LINE = /^#{1,6}\s/;
const WORD_CHAR = /[\p{L}\p{N}_]/u;

export interface ContentQuery {
  terms: string[];
  /** The whole query, folded, with whitespace collapsed. */
  phrase: string;
}

/** Null when the trimmed query is shorter than 2 characters. */
export function parseContentQuery(query: string): ContentQuery | null {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_CHARS) return null;
  const phrase = foldCase(trimmed).replace(/\s+/g, " ");
  return { terms: [...new Set(phrase.split(" "))], phrase };
}

interface LineSpan { line: number; start: number; end: number }

// Every start offset of `term` in `text` within [from, to).
function occurrences(text: string, term: string, from: number, to: number, cap = Infinity): number[] {
  const found: number[] = [];
  let index = text.indexOf(term, from);
  while (index !== -1 && index < to && found.length < cap) {
    found.push(index);
    index = text.indexOf(term, index + term.length);
  }
  return found;
}

// Line spans for the given offsets, in one forward pass over the note.
function spansFor(text: string, offsets: number[]): Map<number, LineSpan> {
  const spans = new Map<number, LineSpan>();
  let line = 1;
  let start = 0;
  let newline = text.indexOf("\n");
  for (const offset of [...offsets].sort((a, b) => a - b)) {
    while (newline !== -1 && newline < offset) {
      line++;
      start = newline + 1;
      newline = text.indexOf("\n", start);
    }
    if (spans.has(start)) continue;
    let end = newline === -1 ? text.length : newline;
    if (text[end - 1] === "\r") end--;
    spans.set(start, { line, start, end });
  }
  return spans;
}

// The trimmed line, windowed around the first match, with highlight indices.
export function buildSnippet(raw: string, foldedLine: string, terms: string[]): { snippet: string; highlights: number[] } {
  const lead = raw.length - raw.trimStart().length;
  const trimmed = raw.trim();
  const covered = new Set<number>();
  for (const term of terms) {
    for (const at of occurrences(foldedLine, term, 0, foldedLine.length)) {
      for (let index = at; index < at + term.length; index++) covered.add(index - lead);
    }
  }
  const inTrimmed = [...covered].filter((index) => index >= 0 && index < trimmed.length).sort((a, b) => a - b);
  if (trimmed.length <= SNIPPET_CHARS) return { snippet: trimmed, highlights: inTrimmed };

  let start = Math.max(0, (inTrimmed[0] ?? 0) - SNIPPET_LEAD);
  const end = Math.min(trimmed.length, start + SNIPPET_CHARS);
  start = Math.max(0, end - SNIPPET_CHARS);
  const prefix = start > 0 ? "…" : "";
  const snippet = `${prefix}${trimmed.slice(start, end)}${end < trimmed.length ? "…" : ""}`;
  const highlights = inTrimmed.filter((index) => index >= start && index < end).map((index) => index - start + prefix.length);
  return { snippet, highlights };
}

function startsWord(text: string, at: number): boolean {
  return at === 0 || !WORD_CHAR.test(text[at - 1]);
}

interface RankedNote { path: string; score: number; hits: ContentHit[] }

function rankNote(path: string, index: ContentIndex, query: ContentQuery): RankedNote | null {
  const entry = index.get(path);
  if (!entry || entry.sensitive) return null;
  const { text, folded, bodyStart, name } = entry;
  const { terms, phrase } = query;
  if (terms.some((term) => folded.indexOf(term, bodyStart) === -1)) return null;

  const perTerm = Math.ceil(MAX_OCCURRENCES_PER_NOTE / terms.length);
  const offsets = terms.flatMap((term) => occurrences(folded, term, bodyStart, folded.length, perTerm));
  const multiTerm = terms.length > 1;

  const hits: ContentHit[] = [];
  for (const span of spansFor(text, offsets).values()) {
    const raw = text.slice(span.start, span.end);
    const foldedLine = folded.slice(span.start, span.end);
    let score = 0;
    let column = Infinity;
    for (const term of terms) {
      const found = occurrences(foldedLine, term, 0, foldedLine.length);
      if (found.length === 0) continue;
      score += 100;
      if (found.some((at) => startsWord(foldedLine, at))) score += 30;
      column = Math.min(column, found[0]);
    }
    // A line starting inside the frontmatter can't hold a body match.
    if (column === Infinity) continue;
    if (multiTerm && foldedLine.includes(phrase)) score += 500;
    if (HEADING_LINE.test(raw)) score += 50;
    const { snippet, highlights } = buildSnippet(raw, foldedLine, terms);
    hits.push({ path, name, line: span.line, column, snippet, highlights, score });
  }
  if (hits.length === 0) return null;
  hits.sort((a, b) => b.score - a.score || a.line - b.line);

  const foldedName = foldCase(name);
  const score = hits[0].score
    + (multiTerm && folded.indexOf(phrase, bodyStart) !== -1 ? 1000 : 0)
    + (terms.some((term) => foldedName.includes(term)) ? 200 : 0)
    + 5 * Math.min(offsets.length, 10);
  return { path, score, hits: hits.slice(0, MAX_HITS_PER_NOTE) };
}

/** Searches the notes in `paths` (paths with no indexed text count as `pending`). */
export function searchContent(
  index: ContentIndex,
  query: string,
  paths: string[],
  limit: number,
): { hits: ContentHit[]; pending: number; capped: boolean } {
  const parsed = parseContentQuery(query);
  let pending = 0;
  const notes: RankedNote[] = [];
  for (const path of paths) {
    if (!index.has(path)) {
      pending++;
      continue;
    }
    const note = parsed ? rankNote(path, index, parsed) : null;
    if (note) notes.push(note);
  }
  notes.sort((a, b) => b.score - a.score || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return { hits: notes.flatMap((note) => note.hits).slice(0, limit), pending, capped: index.capped };
}

// Handles a typed note-text message; returns false for anything else (the
// original metadata parse request).
export function handleContentMessage(
  index: ContentIndex,
  data: ContentRequest | { type?: undefined },
  post: (message: ContentResults) => void,
): boolean {
  switch (data?.type) {
    case "content:index":
      for (const file of data.files) index.upsert(file.path, file.name, file.content, file.modifiedAt);
      return true;
    case "content:remove":
      index.remove(data.paths);
      return true;
    case "content:clear":
      index.clear();
      return true;
    case "content:remap":
      index.remap(data.oldPath, data.newPath);
      return true;
    case "content:search":
      post({ type: "content:results", searchId: data.searchId, ...searchContent(index, data.query, data.paths, data.limit) });
      return true;
    default:
      return false;
  }
}
