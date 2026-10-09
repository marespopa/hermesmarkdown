// Line-level patterns and fixes for the Markdown Cleaner (clean-markdown.ts).

// Leading whitespace as columns (tabs stop every 4) and the rest of the line.
export function splitIndent(line: string): { indent: number; rest: string } {
  let indent = 0;
  let i = 0;
  for (; i < line.length; i++) {
    if (line[i] === " ") indent++;
    else if (line[i] === "\t") indent += 4 - (indent % 4);
    else break;
  }
  return { indent, rest: line.slice(i) };
}

export const isBlank = (line: string) => !line.trim();

// A list item: bullet (including pasted glyphs) or `1.` / `1)`, then the content.
const LIST_ITEM = /^([-*+]|\d{1,9}[.)])(?:[ \t]+(.*))?$|^([•◦▪‣●○■])[ \t]*(.*)$/;

export interface ListItem {
  marker: string;
  // The marker as written, and the width up to the content in the source.
  sourceMarker: string;
  gap: number;
  content: string;
}

export function parseListItem(rest: string): ListItem | null {
  const match = LIST_ITEM.exec(rest);
  if (!match) return null;
  const sourceMarker = match[1] ?? match[3];
  const content = (match[1] ? match[2] : match[4]) ?? "";
  const gap = rest.length - sourceMarker.length - content.length;
  const ordered = /^(\d+)[.)]$/.exec(sourceMarker);
  return { marker: ordered ? `${ordered[1]}.` : "-", sourceMarker, gap, content };
}

// `***`, `___`, `- - -` …
export const isRule = (rest: string) => /^([-*_])([ \t]*\1){2,}[ \t]*$/.test(rest);

export const setextLevel = (rest: string): 1 | 2 | null =>
  /^=+[ \t]*$/.test(rest) ? 1 : /^-+[ \t]*$/.test(rest) ? 2 : null;

export interface Fence {
  char: "`" | "~";
  length: number;
  // Source indent of the opening fence.
  indent: number;
}

export function parseFenceOpen(rest: string, indent: number): Fence | null {
  const match = /^(`{3,}|~{3,})(.*)$/.exec(rest);
  if (!match) return null;
  // A backtick fence's info string can't hold backticks.
  if (match[1][0] === "`" && match[2].includes("`")) return null;
  return { char: match[1][0] as Fence["char"], length: match[1].length, indent };
}

export function isFenceClose(line: string, fence: Fence): boolean {
  const { indent, rest } = splitIndent(line);
  const match = /^(`{3,}|~{3,})[ \t]*$/.exec(rest);
  return indent <= fence.indent + 3 && !!match && match[1][0] === fence.char && match[1].length >= fence.length;
}

// A table's separator row: `|---|:--:|` (outer pipes optional, one pipe at least).
export const isTableSeparator = (line: string) =>
  line.includes("|") && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(line);

// ATX heading normalized: one space after the #s, no closing #s, no indent.
// `#tag` (a single # and no space in the rest) is left alone.
export function fixHeading(rest: string): string | null {
  const match = /^(#{1,6})(?:([ \t]+)(.*)|([^#\s].*))?$/.exec(rest);
  if (!match) return null;
  const hashes = match[1];
  let text: string;
  if (match[4] !== undefined) {
    // No space after the #s.
    if (hashes.length === 1 && !/\s/.test(match[4])) return null;
    if (hashes.length === 1 && /^\d/.test(match[4])) return null;
    text = match[4];
  } else {
    text = match[3] ?? "";
  }
  text = text.replace(/[ \t]+#+[ \t]*$/, "").replace(/^#+[ \t]*$/, "").trim();
  return text ? `${hashes} ${text}` : hashes;
}

// Applies `fn` to the parts of a line outside inline code spans.
export function mapOutsideCode(line: string, fn: (text: string) => string): string {
  if (!line.includes("`")) return fn(line);
  let out = "";
  let last = 0;
  const span = /(`+)(?:[^`]|[^`][\s\S]*?[^`])\1(?!`)/g;
  for (let match = span.exec(line); match; match = span.exec(line)) {
    if (match.index > 0 && line[match.index - 1] === "`") continue;
    out += fn(line.slice(last, match.index)) + match[0];
    last = match.index + match[0].length;
  }
  return out + fn(line.slice(last));
}

// Styling HTML in Markdown text: span/font/o:p unwrapped, style attributes
// dropped, b/strong → **, i/em → *. Returns the line and the tags fixed.
export function cleanInlineHtml(line: string): { line: string; count: number } {
  if (!line.includes("<")) return { line, count: 0 };
  let count = 0;
  const swap = (pattern: RegExp, replacement: string) => (text: string) =>
    text.replace(pattern, () => {
      count++;
      return replacement;
    });
  const steps = [
    swap(/<\/?(?:span|font|o:p)\b[^>]*>/gi, ""),
    swap(/<\/?(?:b|strong)>/gi, "**"),
    swap(/<\/?(?:i|em)>/gi, "*"),
    (text: string) =>
      text.replace(/<([a-z][\w-]*)([^>]*?)\s+style\s*=\s*("[^"]*"|'[^']*')([^>]*)>/gi, (_m, tag, before, _style, after) => {
        count++;
        return `<${tag}${before}${after}>`;
      }),
  ];
  const result = mapOutsideCode(line, (text) => steps.reduce((acc, step) => step(acc), text));
  return { line: result, count };
}
