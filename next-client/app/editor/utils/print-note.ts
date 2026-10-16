// Prints rendered note HTML through the browser's print dialog, where "Save
// as PDF" makes the file. Nothing leaves the device: the page is built in a
// hidden same-origin iframe, so the app's own DOM, theme and chrome never
// reach the printout, and Ctrl/Cmd+P keeps opening the palette.

import { escapeHtml, PAGE_BREAK_HTML } from "@/app/utils/print/note-html";
import { DEFAULT_PRINT_SETTINGS, MARGIN_CSS, printDate, templateSlots, type PrintSettings, type SlotPart, type Slots } from "@/app/utils/print/print-settings";

// Always light, whatever the app theme. Breaks avoid splitting a table row,
// a code block, a diagram or a callout, and keep headings with what follows.
// The page's size and margins come from pageCss().
export const PRINT_CSS = `
* { box-sizing: border-box; }
html { color: #1f1d1a; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font: 11pt/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
h1, h2, h3, h4, h5, h6 { line-height: 1.25; margin: 1.4em 0 0.5em; break-after: avoid; page-break-after: avoid; }
h1 { font-size: 20pt; margin-top: 0; }
h2 { font-size: 15pt; border-bottom: 1px solid #e3ded6; padding-bottom: 0.2em; }
h3 { font-size: 12.5pt; }
p, ul, ol, table, pre, blockquote, .callout, .rendered { margin: 0 0 0.8em; }
ul, ol { padding-left: 1.4em; }
li > p { margin: 0; }
li.task { list-style: none; margin-left: -1.3em; }
.task-box { display: inline-block; width: 0.9em; height: 0.9em; margin-right: 0.45em; border: 1.2px solid #8a857d; border-radius: 3px; vertical-align: -0.1em; font-size: 0.75em; line-height: 0.95em; text-align: center; }
.task-box.done { background: #626f54; border-color: #626f54; color: #fff; }
code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 9.5pt; }
code { background: #f3f0eb; border-radius: 3px; padding: 0.05em 0.3em; }
pre { background: #f6f4f0; border: 1px solid #e3ded6; border-radius: 6px; padding: 0.7em 0.9em; white-space: pre-wrap; word-break: break-word; break-inside: avoid; }
pre code { background: none; padding: 0; }
blockquote { border-left: 3px solid #d6cfc6; padding-left: 0.9em; color: #4a4741; }
.callout { border: 1px solid #e3ded6; border-left: 3px solid #4f6684; border-radius: 6px; padding: 0.6em 0.9em; break-inside: avoid; }
.callout-success, .callout-tip, .callout-done { border-left-color: #626f54; }
.callout-warning, .callout-caution, .callout-danger, .callout-bug { border-left-color: #a2563e; }
.callout-title { font-weight: 600; margin-bottom: 0.3em; }
.callout > :last-child, blockquote > :last-child { margin-bottom: 0; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #ddd6cc; padding: 0.35em 0.6em; text-align: left; vertical-align: top; }
th { background: #f6f4f0; }
tr, img, svg, .rendered { break-inside: avoid; page-break-inside: avoid; }
thead { display: table-header-group; }
img, svg { max-width: 100%; height: auto; }
a { color: #2c66d1; text-decoration: none; }
.wikilink { color: #4f6684; }
.image-alt { color: #6d6b67; font-style: italic; }
.rendered { text-align: center; }
.render-error { color: #a2563e; font-size: 9.5pt; text-align: left; }
hr { border: 0; border-top: 1px solid #e3ded6; margin: 1.5em 0; }
.page-break { break-after: page; page-break-after: always; height: 0; margin: 0; }
`;

const MARGIN_BOX_CSS = 'font: 8.5pt -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #6d6b67;';

// A CSS string literal. `<` is escaped too: the rule sits in a <style>, and a
// title holding "</style>" must not end it.
const cssString = (value: string) =>
  `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/</g, "\\3c ").replace(/\s*\n\s*/g, " ")}"`;

// A slot as a CSS `content` value: strings and page counters.
function slotContent(parts: SlotPart[]): string {
  return parts.map((part) => ("counter" in part ? `counter(${part.counter})` : cssString(part.text))).join(" ");
}

function marginBoxes(edge: "top" | "bottom", slots: Slots): string {
  return (["left", "center", "right"] as const)
    .map((slot) => {
      const parts = slots[slot];
      return parts ? `@${edge}-${slot} { content: ${slotContent(parts)}; ${MARGIN_BOX_CSS} }` : "";
    })
    .join(" ");
}

export interface PageValues {
  title: string;
  /** What {date} prints as; today by default. */
  date?: string;
}

// The `@page` rule: size, margins, and the header and footer as page-margin
// boxes (Chrome and Edge print them; browsers without margin boxes leave
// them out, the rest of the page is the same).
export function pageCss(settings: PrintSettings, values: PageValues): string {
  const filled = { title: values.title, date: values.date ?? printDate() };
  const header = settings.header ? marginBoxes("top", templateSlots(settings.header, filled)) : "";
  const footer = settings.footer ? marginBoxes("bottom", templateSlots(settings.footer, filled)) : "";
  return `@page { size: ${settings.pageSize}; margin: ${MARGIN_CSS[settings.margins]}; ${header} ${footer} }`;
}

// With "New page at each rule" on, every horizontal rule becomes a page break.
export function pagedBody(body: string, settings: PrintSettings): string {
  return settings.breakAtRules ? body.replaceAll("<hr>", PAGE_BREAK_HTML) : body;
}

export function printDocument(title: string, body: string, settings: PrintSettings = DEFAULT_PRINT_SETTINGS, date?: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${pageCss(settings, { title, date })}${PRINT_CSS}</style></head><body>${pagedBody(body, settings)}</body></html>`;
}

const waitForImages = (doc: Document) =>
  Promise.all(
    Array.from(doc.images).map((img) =>
      img.complete ? Promise.resolve() : new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      }),
    ),
  );

// Opens the print dialog for `html` (a full document). Resolves once the
// dialog has closed (or the browser returned from print()), after which the
// iframe is removed and `cleanup` runs (e.g. revoking image object URLs).
export async function printHtml(html: string, cleanup?: () => void): Promise<void> {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  // Off-screen but laid out at page width, so the print preview is right.
  frame.style.cssText = "position:fixed;left:-10000px;top:0;width:800px;height:600px;border:0;visibility:hidden;";
  document.body.appendChild(frame);
  const finish = () => {
    frame.remove();
    cleanup?.();
  };
  try {
    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    if (!win || !doc) throw new Error("Print frame unavailable");
    doc.open();
    doc.write(html);
    doc.close();
    await waitForImages(doc);
    // Chrome blocks in print(); Firefox and Safari return at once. All fire
    // afterprint when the dialog closes, so the frame stays until then (or
    // a minute, should a browser never fire it).
    const closed = new Promise<void>((resolve) => {
      win.addEventListener("afterprint", () => resolve(), { once: true });
      setTimeout(resolve, 60_000);
    });
    win.focus();
    win.print();
    await closed;
  } finally {
    // A moment's grace: some browsers still read the frame right after print() returns.
    setTimeout(finish, 1000);
  }
}
