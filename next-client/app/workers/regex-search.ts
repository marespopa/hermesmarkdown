// Regex search over one file's text, for the palette's `/` scope with Regex
// on. Runs only in the text-file grep worker (text-grep.ts), which the main
// thread can stop if a pattern backtracks for too long; never in the
// metadata worker, where a stuck pattern would stall indexing. Case-
// insensitive; `^` and `$` match at line ends. Pure.
import { MAX_HITS_PER_NOTE, snippetFromRanges, WORD_CHAR, type RankedNote } from "./content-search";
import type { ContentHit } from "./content-search-protocol";

const MAX_MATCHES_PER_FILE = 200;

/** The query as a pattern, or null when it doesn't compile. */
export function parseRegexQuery(query: string): RegExp | null {
  const source = query.trim();
  if (!source) return null;
  for (const flags of ["gimu", "gim"]) {
    try {
      return new RegExp(source, flags);
    } catch {
      // `u` rejects some escapes people type (`\-`, `\_`); try without it.
    }
  }
  return null;
}

interface Match { from: number; to: number }

// Ranks the lines of `text` (from `bodyStart`, past a note's frontmatter)
// that `regex` matches, like rankText: one point block per line, more for a
// match at a word start, the file by its best line and match count.
export function rankRegex(
  path: string,
  { text, bodyStart, name }: { text: string; bodyStart: number; name: string },
  regex: RegExp,
): RankedNote | null {
  const matches: Match[] = [];
  regex.lastIndex = bodyStart;
  let found: RegExpExecArray | null;
  while (matches.length < MAX_MATCHES_PER_FILE && (found = regex.exec(text))) {
    if (found[0].length === 0) {
      // An empty match (`a*`, `^`) marks nothing; step past it.
      regex.lastIndex++;
      continue;
    }
    matches.push({ from: found.index, to: found.index + found[0].length });
  }
  if (matches.length === 0) return null;

  const hits: ContentHit[] = [];
  let line = 1;
  let lineStart = 0;
  let scanned = 0;
  let current: { start: number; end: number; ranges: [number, number][] } | null = null;
  const flush = () => {
    if (!current) return;
    const raw = text.slice(current.start, current.end);
    const column = current.ranges[0][0];
    const score = 100 + (column === 0 || !WORD_CHAR.test(raw[column - 1]) ? 30 : 0);
    hits.push({ path, name, line, column, ...snippetFromRanges(raw, current.ranges), score });
  };
  for (const match of matches) {
    // Advance to the line holding the match start.
    let newline = text.indexOf("\n", scanned);
    while (newline !== -1 && newline < match.from) {
      if (current) {
        flush();
        current = null;
      }
      line++;
      lineStart = newline + 1;
      newline = text.indexOf("\n", lineStart);
    }
    scanned = lineStart;
    let end = newline === -1 ? text.length : newline;
    if (text[end - 1] === "\r") end--;
    current ??= { start: lineStart, end, ranges: [] };
    // A match running onto later lines is marked in its first one.
    current.ranges.push([match.from - lineStart, Math.min(match.to, end) - lineStart]);
  }
  flush();
  hits.sort((a, b) => b.score - a.score || a.line - b.line);

  return { path, score: hits[0].score + 5 * Math.min(matches.length, 10), hits: hits.slice(0, MAX_HITS_PER_NOTE) };
}
