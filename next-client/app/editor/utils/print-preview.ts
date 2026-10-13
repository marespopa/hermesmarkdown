// The export dialog's preview: the print page laid out on screen as sheets
// of the chosen paper, with its margins, header and footer. Each page-break
// marker starts a new sheet. The browser only splits long text into pages
// when it prints, so a sheet that runs long shows a faint line where each
// page would end, and page numbers count sheets.

import { escapeHtml, PAGE_BREAK_HTML } from "@/app/utils/print/note-html";
import { PAGE_DIMENSIONS, printDate, templateSlots, type PrintSettings, type SlotPart, type Slots } from "@/app/utils/print/print-settings";
import { PRINT_CSS } from "./print-note";

/** Width the preview is laid out at, in CSS px; the dialog scales it to fit. */
export const PREVIEW_FRAME_WIDTH = 880;

// "18mm 16mm" → top, right, bottom, left, as CSS margin shorthand reads it.
export function marginSides(margins: string): [string, string, string, string] {
  const [top, right = top, bottom = top, left = right] = margins.split(/\s+/);
  return [top, right, bottom, left];
}

function slotHtml(parts: SlotPart[] | null, page: number, pages: number): string {
  if (!parts) return "<span></span>";
  return `<span>${parts.map((part) => escapeHtml("counter" in part ? String(part.counter === "page" ? page : pages) : part.text)).join("")}</span>`;
}

const running = (edge: "top" | "bottom", slots: Slots | null, page: number, pages: number) =>
  slots ? `<div class="running ${edge}">${slotHtml(slots.left, page, pages)}${slotHtml(slots.center, page, pages)}${slotHtml(slots.right, page, pages)}</div>` : "";

function previewCss(settings: PrintSettings): string {
  const { width, height } = PAGE_DIMENSIONS[settings.pageSize];
  const [top, right, bottom, left] = marginSides(settings.margins);
  return `
html, body { background: #e9e6e1; }
body { padding: 24px 0; }
.sheet { position: relative; width: ${width}; min-height: ${height}; margin: 0 auto 24px; padding: ${settings.margins}; background: repeating-linear-gradient(to bottom, transparent 0 calc(${height} - 1px), #d6cfc6 calc(${height} - 1px) ${height}) #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.18); overflow: hidden; }
.sheet > .content > :first-child { margin-top: 0; }
.running { position: absolute; left: ${left}; right: ${right}; display: grid; grid-template-columns: 1fr auto 1fr; gap: 1em; align-items: center; font-size: 8.5pt; color: #6d6b67; }
.running span:nth-child(2) { text-align: center; }
.running span:last-child { text-align: right; }
.running.top { top: 0; height: ${top}; }
.running.bottom { bottom: 0; height: ${bottom}; }
`;
}

export function previewDocument(title: string, body: string, settings: PrintSettings, date = printDate()): string {
  const values = { title, date };
  const header = settings.header ? templateSlots(settings.header, values) : null;
  const footer = settings.footer ? templateSlots(settings.footer, values) : null;
  const sections = body.split(PAGE_BREAK_HTML);
  const sheets = sections
    .map((section, index) => `<section class="sheet">${running("top", header, index + 1, sections.length)}<div class="content">${section}</div>${running("bottom", footer, index + 1, sections.length)}</section>`)
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${PRINT_CSS}${previewCss(settings)}</style></head><body>${sheets}</body></html>`;
}
