import { FADED } from "./highlight-inline";

// Block styles the syntax highlighter (highlight.ts) gives a line: a
// heading, a quote, a list item, a table row. The same styles apply inside a
// callout, to the text after its `>` prefix (styleCalloutBody), so headings,
// lists, tables and code read there as they do in the rest of the note.

export const REGEX_HEADING = /^#{1,6}\s/;
const REGEX_HEADING_PARTS = /^(#{1,6}\s+)(.*)$/;
const REGEX_BLOCKQUOTE_PARTS = /^(>\s?)(.*)$/;
export const REGEX_LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+/;
const REGEX_LIST_PARTS = /^(\s*(?:[-*+]|\d+[.)])\s+)(\[[ xX/!-]\]\s+)?(.*)$/;
export const REGEX_TABLE_LINE = /^\s*\|/;
export const REGEX_TABLE_SEPARATOR = /^\s*\|[\s:|-]+\|/;
// A run of `>`s: a quote's own prefix, nested quotes included.
const REGEX_QUOTE_RUN = /^(?:>[ \t]?)+/;
const REGEX_FENCE = /^\s*(```|~~~)/;
const REGEX_THEMATIC_BREAK = /^( {0,3}([-*_])(?:\s*\2){2,}\s*)$/;

const LABEL = "text-ink-light dark:text-ink-dark";

/** Where a line's marks go: already limited to the lines being decorated. */
export interface BlockStyler {
  mark: (from: number, to: number, className: string) => void;
  inline: (label: string, base: number) => void;
}

// Heading lines carry `cm-heading cm-heading-N`; their size and tracking
// live in editor-typography.scss.
export const headingLineClass = (level: number) => `cm-heading cm-heading-${level}`;

/** `# Title`: the hashes faded, the label semibold. Returns the level. */
export function styleHeading(out: BlockStyler, text: string, base: number): number {
  const m = REGEX_HEADING_PARTS.exec(text)!;
  const hashes = m[1];
  out.mark(base, base + hashes.length, FADED);
  out.mark(base + hashes.length, base + text.length, `font-semibold ${LABEL}`);
  out.inline(m[2], base + hashes.length);
  return hashes.trimEnd().length;
}

/** `> quote`: the mark faded, the text muted. */
export function styleQuote(out: BlockStyler, text: string, base: number) {
  const m = REGEX_BLOCKQUOTE_PARTS.exec(text)!;
  const quote = m[1];
  out.mark(base, base + quote.length, FADED);
  out.mark(base + quote.length, base + text.length, "text-ink-muted dark:text-stone");
  out.inline(m[2], base + quote.length);
}

/** `- item` / `1. item` / `- [x] task`: done and cancelled tasks get their look. */
export function styleListItem(out: BlockStyler, text: string, base: number) {
  const m = REGEX_LIST_PARTS.exec(text)!;
  // The marker itself is styled by live-markers.ts (muted, or a task's
  // status colour), so it isn't faded here.
  const cursor = m[1].length + (m[2]?.length ?? 0);
  const state = m[2]?.[1].toLowerCase();
  if (state === "x") out.mark(base + cursor, base + text.length, "cm-task-done");
  else if (state === "-") out.mark(base + cursor, base + text.length, "cm-task-cancelled");
  out.inline(m[3], base + cursor);
}

/** A `| a | b |` row: pipes faded, a header row bold; the separator faded. */
export function styleTableRow(out: BlockStyler, text: string, base: number, isHeader: boolean) {
  if (REGEX_TABLE_SEPARATOR.test(text)) {
    out.mark(base, base + text.length, FADED);
    return;
  }
  let cellStart = 0;
  for (const [ci, cell] of text.split("|").entries()) {
    const cellBase = base + cellStart;
    if (ci > 0) out.mark(cellBase - 1, cellBase, FADED);
    out.inline(cell, cellBase);
    if (isHeader) out.mark(cellBase, cellBase + cell.length, `font-bold ${LABEL}`);
    cellStart += cell.length + 1;
  }
}

/**
 * Length of a callout line's own prefix: `depth` `>`s, each with the spaces
 * before it and one space after, so a nested list keeps its indent (`>   - b`
 * leaves `  - b`) and a quote inside the callout keeps its `>`.
 */
export function calloutBodyPrefixLength(text: string, depth: number): number {
  let i = 0;
  for (let d = 0; d < depth; d++) {
    while (text[i] === " " || text[i] === "\t") i++;
    if (text[i] !== ">") return i;
    i++;
    if (text[i] === " " || text[i] === "\t") i++;
  }
  return i;
}

/**
 * A quote inside a callout (`> > text`): its `>`s faded, then a heading or
 * list item styled as such (a heading sized), any other text muted as a quote.
 */
function styleQuoteInCallout(out: BlockStyler, text: string, base: number): string {
  const prefix = REGEX_QUOTE_RUN.exec(text)![0];
  const rest = text.slice(prefix.length);
  const restBase = base + prefix.length;
  out.mark(base, restBase, FADED);
  if (REGEX_HEADING.test(rest)) return headingLineClass(styleHeading(out, rest, restBase));
  if (REGEX_LIST_ITEM.test(rest)) {
    styleListItem(out, rest, restBase);
  } else {
    out.mark(restBase, base + text.length, "text-ink-muted dark:text-stone");
    out.inline(rest, restBase);
  }
  return "";
}

/** What a callout's body has seen so far: an open code fence, a table's rows. */
export interface CalloutBody {
  inCode: boolean;
  /** Row of the table the line belongs to (0 = first), or -1. */
  tableRow: number;
}

export const newCalloutBody = (): CalloutBody => ({ inCode: false, tableRow: -1 });

/**
 * Styles one callout line's body, the text after its prefix, starting at
 * `base`: code (fences faded, the code monospaced), headings, quotes, list
 * items, table rows and rules, as outside a callout. `nextBody` is the next
 * line's body when it is still in the callout (a table's header row is the
 * one above its separator). Returns the line's extra class (a heading's), so
 * the callout's tint and bar stay on every line.
 */
export function styleCalloutBody(
  out: BlockStyler,
  body: CalloutBody,
  text: string,
  base: number,
  nextBody: string | null,
): string {
  const isFence = REGEX_FENCE.test(text);
  const isPipe = !body.inCode && !isFence && REGEX_TABLE_LINE.test(text);
  body.tableRow = isPipe ? body.tableRow + 1 : -1;

  if (isFence) {
    body.inCode = !body.inCode;
    out.mark(base, base + text.length, FADED);
    return "";
  }
  if (body.inCode) {
    out.mark(base, base + text.length, "cm-callout-code");
    return "";
  }
  if (!text.trim()) return "";
  if (REGEX_THEMATIC_BREAK.test(text)) {
    out.mark(base, base + text.length, FADED);
    return "";
  }
  if (REGEX_HEADING.test(text)) return headingLineClass(styleHeading(out, text, base));
  if (text.startsWith(">")) return styleQuoteInCallout(out, text, base);
  if (REGEX_LIST_ITEM.test(text)) styleListItem(out, text, base);
  else if (isPipe) {
    const isHeader = body.tableRow === 0 && nextBody !== null && REGEX_TABLE_SEPARATOR.test(nextBody);
    styleTableRow(out, text, base, isHeader);
  } else out.inline(text, base);
  return "";
}
