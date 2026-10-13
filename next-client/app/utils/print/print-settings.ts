// A note's PDF page setup, read from flat `pdf_*` frontmatter keys:
//
//   pdf_page_size: Letter          # A4 (default) or Letter
//   pdf_margins: 20mm 15mm         # 1–4 CSS lengths (mm, cm, in, pt, px); a bare number is mm
//   pdf_header: "{title} | {date}"
//   pdf_footer: "{page} / {pages}"
//   pdf_page_break: "---"          # a line that starts a new page; default <!-- pagebreak -->
//
// A header or footer is text with {title}, {date}, {page} and {pages}. A `|`
// splits it into left | right, or left | centre | right; on its own it's
// centred.

import { parseFmFields } from "../frontmatter-utils";

export type PageSize = "A4" | "Letter";

export interface PrintSettings {
  pageSize: PageSize;
  /** CSS margin shorthand, e.g. "18mm 16mm". */
  margins: string;
  header: string | null;
  footer: string | null;
  /** The line that starts a new page. */
  pageBreak: string;
}

export const DEFAULT_PAGE_BREAK = "<!-- pagebreak -->";

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  pageSize: "A4",
  margins: "18mm 16mm",
  header: null,
  footer: null,
  pageBreak: DEFAULT_PAGE_BREAK,
};

/** Page width and height, as CSS lengths. */
export const PAGE_DIMENSIONS: Record<PageSize, { width: string; height: string }> = {
  A4: { width: "210mm", height: "297mm" },
  Letter: { width: "8.5in", height: "11in" },
};

const REGEX_LENGTH = /^(\d+(?:\.\d+)?)(mm|cm|in|pt|px)?$/i;

function parsePageSize(value: string | undefined): PageSize {
  const size = value?.trim().toLowerCase();
  return size === "letter" ? "Letter" : "A4";
}

function parseMargins(value: string | undefined): string {
  const parts = value?.trim().split(/[\s,]+/).filter(Boolean) ?? [];
  if (!parts.length || parts.length > 4) return DEFAULT_PRINT_SETTINGS.margins;
  const lengths = parts.map((part) => {
    const match = REGEX_LENGTH.exec(part);
    return match ? `${match[1]}${(match[2] ?? "mm").toLowerCase()}` : null;
  });
  return lengths.every(Boolean) ? lengths.join(" ") : DEFAULT_PRINT_SETTINGS.margins;
}

const text = (value: string | undefined) => value?.trim().replace(/^'(.*)'$/, "$1") || null;

export function printSettingsFrom(markdown: string): PrintSettings {
  const fields = parseFmFields(markdown);
  return {
    pageSize: parsePageSize(fields.pdf_page_size),
    margins: parseMargins(fields.pdf_margins),
    header: text(fields.pdf_header),
    footer: text(fields.pdf_footer),
    pageBreak: text(fields.pdf_page_break) ?? DEFAULT_PAGE_BREAK,
  };
}

export type SlotPart = { text: string } | { counter: "page" | "pages" };

/** A header's or footer's slots, left to right (null for an empty slot). */
export interface Slots {
  left: SlotPart[] | null;
  center: SlotPart[] | null;
  right: SlotPart[] | null;
}

// "{title} – page {page}" → [title text, " – page ", page counter], with
// {title} and {date} filled in now and the counters left to the page.
function slotParts(template: string, values: { title: string; date: string }): SlotPart[] | null {
  const parts: SlotPart[] = [];
  for (const piece of template.split(/(\{(?:title|date|page|pages)\})/)) {
    if (!piece) continue;
    if (piece === "{page}" || piece === "{pages}") parts.push({ counter: piece.slice(1, -1) as "page" | "pages" });
    else parts.push({ text: piece === "{title}" ? values.title : piece === "{date}" ? values.date : piece });
  }
  return parts.some((part) => "counter" in part || part.text.trim()) ? parts : null;
}

export function templateSlots(template: string, values: { title: string; date: string }): Slots {
  const pieces = template.split(/\s*\|\s*/).map((piece) => slotParts(piece.trim(), values));
  if (pieces.length === 1) return { left: null, center: pieces[0], right: null };
  if (pieces.length === 2) return { left: pieces[0], center: null, right: pieces[1] };
  return { left: pieces[0], center: pieces[1], right: pieces[2] };
}

/** Today as YYYY-MM-DD, local time. */
export function printDate(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
