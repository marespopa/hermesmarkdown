// The raw-text matcher behind Replace in Files. Unlike the search matchers
// (content-search.ts, regex-search.ts) it works on the file exactly as
// saved: literal or regex, untrimmed, with offsets, so a replacement can be
// previewed and written. Imported by the replace scan (worker) and the
// page's apply step. Pure, no DOM.

export interface ReplaceOptions { matchCase: boolean; wholeWord: boolean; regex: boolean }
export interface ReplaceQuery extends ReplaceOptions { find: string }
export interface ReplaceMatch {
  /** Index among the file's matches (after board exclusion). */
  ordinal: number;
  /** Offsets in the raw file text. */
  from: number;
  to: number;
  /** 1-based line of `from`. */
  line: number;
  /** 0-based column in that line. */
  column: number;
  /** Up to 60 characters of the line before the match, "…" first if cut. */
  before: string;
  /** The matched text (its first line only when it spans lines, then "…"). */
  text: string;
  /** Up to 60 characters after the match on the same line, "…" last if cut. */
  after: string;
  /** Regex mode: `$1`… */
  groups?: (string | undefined)[];
  /** Regex mode: `$<name>`. */
  named?: Record<string, string | undefined>;
  /** The whole matched text (`$&`). */
  full: string;
}

export const MAX_PREVIEW_MATCHES = 5000;
const CONTEXT_CHARS = 60;
const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;

/** The query as a global pattern; null when Find is empty or doesn't compile. */
export function buildReplacePattern(query: ReplaceQuery): RegExp | null {
  if (!query.find) return null;
  const core = query.regex ? query.find : query.find.replace(REGEX_SPECIAL, "\\$&");
  const caseFlag = query.matchCase ? "" : "i";
  for (const unicode of [true, false]) {
    const word = unicode ? "[\\p{L}\\p{N}_]" : "[A-Za-z0-9_]";
    const source = query.wholeWord ? `(?<!${word})(?:${core})(?!${word})` : core;
    try {
      return new RegExp(source, `gm${caseFlag}${unicode ? "u" : ""}`);
    } catch {
      // `u` rejects some escapes people type (`\-`, `\_`); try without it.
    }
  }
  return null;
}

// The one matching loop, used by findMatches and applyReplacements so both
// number matches the same way. Empty matches are skipped; matches that
// overlap an `exclude` range are dropped (and take no ordinal). `visit`
// returns false to stop.
function forEachMatch(
  text: string,
  pattern: RegExp,
  exclude: readonly [number, number][],
  visit: (found: RegExpExecArray, ordinal: number) => boolean | void,
): void {
  pattern.lastIndex = 0;
  let ordinal = 0;
  let firstExclude = 0;
  let found: RegExpExecArray | null;
  while ((found = pattern.exec(text))) {
    const from = found.index;
    const to = from + found[0].length;
    if (to === from) {
      pattern.lastIndex++;
      continue;
    }
    while (firstExclude < exclude.length && exclude[firstExclude][1] <= from) firstExclude++;
    if (firstExclude < exclude.length && exclude[firstExclude][0] < to) continue;
    if (visit(found, ordinal++) === false) return;
  }
}

/** Every match in `text`, with line, column and context, up to `cap`. */
export function findMatches(text: string, pattern: RegExp, exclude: readonly [number, number][], cap: number): ReplaceMatch[] {
  const matches: ReplaceMatch[] = [];
  if (cap <= 0) return matches;
  let line = 1;
  let lineStart = 0;
  forEachMatch(text, pattern, exclude, (found, ordinal) => {
    const from = found.index;
    const to = from + found[0].length;
    let newline = text.indexOf("\n", lineStart);
    while (newline !== -1 && newline < from) {
      line++;
      lineStart = newline + 1;
      newline = text.indexOf("\n", lineStart);
    }
    let lineEnd = newline === -1 ? text.length : newline;
    if (text[lineEnd - 1] === "\r" && lineEnd - 1 >= from) lineEnd--;
    const cutBefore = from - lineStart > CONTEXT_CHARS;
    const before = (cutBefore ? "…" : "") + text.slice(cutBefore ? from - CONTEXT_CHARS : lineStart, from);
    const spans = to > lineEnd;
    const shown = text.slice(from, Math.min(to, lineEnd)) + (spans ? "…" : "");
    const afterEnd = Math.min(lineEnd, to + CONTEXT_CHARS);
    const after = spans ? "" : text.slice(to, afterEnd) + (afterEnd < lineEnd ? "…" : "");
    const match: ReplaceMatch = { ordinal, from, to, line, column: from - lineStart, before, text: shown, after, full: found[0] };
    if (found.length > 1) match.groups = found.slice(1);
    if (found.groups) match.named = { ...found.groups };
    matches.push(match);
    return matches.length < cap;
  });
  return matches;
}

/** The replacement for one match. Literal mode inserts `template` as typed; regex mode expands `$&`, `$1`–`$99`, `$<name>`, `$$`. */
export function expandReplacement(
  template: string,
  match: Pick<ReplaceMatch, "full" | "groups" | "named">,
  regex: boolean,
): string {
  if (!regex || !template.includes("$")) return template;
  const groups = match.groups ?? [];
  let out = "";
  for (let i = 0; i < template.length; i++) {
    const char = template[i];
    const next = template[i + 1];
    if (char !== "$" || next === undefined) {
      out += char;
    } else if (next === "$") {
      out += "$";
      i++;
    } else if (next === "&") {
      out += match.full;
      i++;
    } else if (next === "<" && match.named) {
      const end = template.indexOf(">", i + 2);
      const name = end === -1 ? "" : template.slice(i + 2, end);
      if (end !== -1 && name in match.named) {
        out += match.named[name] ?? "";
        i = end;
      } else out += char;
    } else if (next >= "0" && next <= "9") {
      const two = Number(template.slice(i + 1, i + 3));
      const afterNext = template[i + 2];
      if (afterNext !== undefined && afterNext >= "0" && afterNext <= "9" && two >= 1 && two <= groups.length) {
        out += groups[two - 1] ?? "";
        i += 2;
      } else if (Number(next) >= 1 && Number(next) <= groups.length) {
        out += groups[Number(next) - 1] ?? "";
        i++;
      } else out += char;
    } else out += char;
  }
  return out;
}

/** `text` with every match replaced except the ordinals in `skip`; `count` is how many were replaced. */
export function applyReplacements(
  text: string,
  pattern: RegExp,
  template: string,
  regex: boolean,
  exclude: readonly [number, number][],
  skip: ReadonlySet<number>,
): { text: string; count: number } {
  let out = "";
  let last = 0;
  let count = 0;
  forEachMatch(text, pattern, exclude, (found, ordinal) => {
    if (skip.has(ordinal)) return;
    out += text.slice(last, found.index);
    out += expandReplacement(template, { full: found[0], groups: found.slice(1), named: found.groups }, regex);
    last = found.index + found[0].length;
    count++;
  });
  return { text: count === 0 ? text : out + text.slice(last), count };
}

/** A cheap identity for a file's text: `${length}:${fnv1a32 hex}`. */
export function textFingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return `${text.length}:${hash.toString(16)}`;
}
