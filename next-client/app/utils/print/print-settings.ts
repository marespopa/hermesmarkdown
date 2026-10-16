// PDF page setup, chosen in the export dialog and remembered for the next
// export (atom_pdfSettings). A header or footer is text with {title},
// {date}, {page} and {pages}. A `|` splits it into left | right, or
// left | centre | right; on its own it's centred.

export type PageSize = "A4" | "Letter";
export type MarginSize = "narrow" | "normal" | "wide";

export interface PrintSettings {
  pageSize: PageSize;
  margins: MarginSize;
  header: string | null;
  footer: string | null;
  /** Horizontal rules (---) start a new page; `<!-- pagebreak -->` always does. */
  breakAtRules: boolean;
}

/** The line that always starts a new page. */
export const DEFAULT_PAGE_BREAK = "<!-- pagebreak -->";

/** Each margin choice as CSS margin shorthand. */
export const MARGIN_CSS: Record<MarginSize, string> = {
  narrow: "10mm",
  normal: "18mm 16mm",
  wide: "25mm 22mm",
};

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  pageSize: "A4",
  margins: "normal",
  header: null,
  footer: null,
  breakAtRules: false,
};

/** Page width and height, as CSS lengths. */
export const PAGE_DIMENSIONS: Record<PageSize, { width: string; height: string }> = {
  A4: { width: "210mm", height: "297mm" },
  Letter: { width: "8.5in", height: "11in" },
};

const text = (value: unknown) => (typeof value === "string" && value.trim() ? value : null);

// Stored settings, checked: anything unreadable falls back to the default.
export function normalizePrintSettings(stored: unknown): PrintSettings {
  const value = (stored && typeof stored === "object" ? stored : {}) as Record<string, unknown>;
  return {
    pageSize: value.pageSize === "Letter" ? "Letter" : "A4",
    margins: typeof value.margins === "string" && value.margins in MARGIN_CSS ? (value.margins as MarginSize) : "normal",
    header: text(value.header),
    footer: text(value.footer),
    breakAtRules: value.breakAtRules === true,
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
