// Unlinked mentions: notes whose body names a phrase (a note's title) as
// plain text. Whole-word, case-insensitive, body only, never inside a
// [[…]] span. Pure; runs over the worker's ContentIndex.

import { ContentIndex, foldCase } from "./content-index";
import { buildSnippet, MAX_HITS_PER_NOTE, WORD_CHAR } from "./content-search";
import type { ContentHit } from "./content-search-protocol";

const MAX_OCCURRENCES_PER_NOTE = 200;
const LINK_SPAN = /\[\[[^\]\n]*\]\]/g;

interface NoteMentions { path: string; lines: number; hits: ContentHit[] }

function mentionsInNote(path: string, index: ContentIndex, phrases: string[]): NoteMentions | null {
  const entry = index.get(path);
  if (!entry || entry.isPrivate) return null;
  const { text, folded, bodyStart, name } = entry;
  const byLine = new Map<number, ContentHit>();
  let lineNumber = 1;
  let lineStart = 0;
  for (let i = 0; i < bodyStart && i < text.length; i++) if (text[i] === "\n") lineNumber++;
  const startAt = bodyStart > 0 ? bodyStart : 0;
  lineStart = startAt;
  let found = 0;
  while (lineStart <= text.length && found < MAX_OCCURRENCES_PER_NOTE) {
    let end = folded.indexOf("\n", lineStart);
    if (end === -1) end = text.length;
    const lineEnd = folded[end - 1] === "\r" ? end - 1 : end;
    const foldedLine = folded.slice(lineStart, lineEnd);
    let column = -1;
    if (foldedLine.length > 0) {
      const spans = [...foldedLine.matchAll(LINK_SPAN)].map((m) => [m.index, m.index + m[0].length] as const);
      for (const phrase of phrases) {
        let at = foldedLine.indexOf(phrase);
        while (at !== -1) {
          const after = at + phrase.length;
          const wordBefore = at > 0 && WORD_CHAR.test(foldedLine[at - 1]);
          const wordAfter = after < foldedLine.length && WORD_CHAR.test(foldedLine[after]);
          const inLink = spans.some(([from, to]) => at < to && after > from);
          if (!wordBefore && !wordAfter && !inLink) {
            found++;
            if (column === -1 || at < column) column = at;
            break;
          }
          at = foldedLine.indexOf(phrase, at + 1);
        }
      }
    }
    if (column !== -1) {
      const raw = text.slice(lineStart, lineEnd);
      const { snippet, highlights } = buildSnippet(raw, foldedLine, phrases);
      byLine.set(lineNumber, { path, name, line: lineNumber, column, snippet, highlights, score: 0 });
    }
    if (end >= text.length) break;
    lineStart = end + 1;
    lineNumber++;
  }
  if (byLine.size === 0) return null;
  const all = [...byLine.values()].sort((a, b) => a.line - b.line);
  return { path, lines: all.length, hits: all.slice(0, MAX_HITS_PER_NOTE) };
}

/** Plain-text mentions of any of `phrases` in the notes of `paths`. */
export function findMentions(
  index: ContentIndex,
  phrases: string[],
  paths: string[],
  limit: number,
): { hits: ContentHit[]; pending: number; capped: boolean } {
  const folded = [...new Set(phrases.map((p) => foldCase(p.trim())).filter((p) => p.length >= 2))];
  let pending = 0;
  const notes: NoteMentions[] = [];
  for (const path of paths) {
    if (!index.has(path)) {
      pending++;
      continue;
    }
    const note = folded.length ? mentionsInNote(path, index, folded) : null;
    if (note) notes.push(note);
  }
  notes.sort((a, b) => b.lines - a.lines || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return { hits: notes.flatMap((n) => n.hits).slice(0, limit), pending, capped: index.capped };
}
