import TurndownService from "turndown";
import { serializeTable } from "@/app/editor/utils/tableSerializer";
import type { Alignment } from "@/app/editor/utils/tableParser";
import { tidyPastedHtml } from "./html-tidy";

// HTML (a web page, Google Docs, Word, a pasted selection) to Markdown with
// turndown, plus our own GFM rules: tables (also without a header row,
// which is how Docs, Sheets and Word paste them), strikethrough, task
// lists, <pre> without <code>, and data: images reduced to their alt text.
// The result still goes through the clean pass (clean-markdown.ts).

// Elements that carry Markdown structure. HTML without any (a code editor's
// coloured <div>/<span> copy) isn't worth converting.
const STRUCTURE = /<(p|h[1-6]|ul|ol|li|table|a|strong|b|em|i|img|blockquote|pre|code|del|s)[\s>]/i;

export const hasMarkdownStructure = (html: string) => STRUCTURE.test(html);

// Turndown's escapes, except `_` only at word edges: GFM ignores an
// intraword underscore, so snake_case stays readable.
const ESCAPES: [RegExp, string][] = [
  [/\\/g, "\\\\"],
  [/\*/g, "\\*"],
  [/^-/g, "\\-"],
  [/^\+ /g, "\\+ "],
  [/^(=+)/g, "\\$1"],
  [/^(#{1,6}) /g, "\\$1 "],
  [/`/g, "\\`"],
  [/^~~~/g, "\\~~~"],
  [/\[/g, "\\["],
  [/\]/g, "\\]"],
  [/^>/g, "\\>"],
  [/(?<![\p{L}\p{N}])_|_(?![\p{L}\p{N}])/gu, "\\_"],
  [/^(\d+)\. /g, "$1\\. "],
];

const escapeMarkdown = (text: string) => ESCAPES.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text);

function codeFence(code: string): string {
  const longest = Math.max(0, ...(code.match(/`+/g) ?? []).map((run) => run.length));
  return "`".repeat(Math.max(3, longest + 1));
}

function cellAlignment(cell: HTMLTableCellElement): Alignment {
  const align = (cell.getAttribute("align") || cell.style.textAlign || "").toLowerCase();
  return align === "center" ? "center" : align === "right" ? "right" : "left";
}

function tableToMarkdown(table: HTMLTableElement, service: TurndownService): string {
  const rows = Array.from(table.rows).map((row) =>
    Array.from(row.cells).flatMap((cell) => {
      const text = service
        .turndown(cell)
        .trim()
        .replace(/\s*\n+\s*/g, "<br>")
        .replace(/\|/g, "\\|");
      return [text, ...Array<string>(Math.max(0, cell.colSpan - 1)).fill("")];
    }),
  );
  if (!rows.length) return "";
  const width = Math.max(...rows.map((row) => row.length));
  const pad = (row: string[]) => [...row, ...Array<string>(width - row.length).fill("")];
  const alignments = pad(Array.from(table.rows[0].cells).map(cellAlignment)).map((alignment) => (alignment || "left") as Alignment);
  const markdown = serializeTable({ headers: pad(rows[0]), rows: rows.slice(1).map(pad), alignments });
  return `\n\n${markdown}\n\n`;
}

function createService(): TurndownService {
  const service = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    fence: "```",
    emDelimiter: "*",
    strongDelimiter: "**",
    linkStyle: "inlined",
  });
  service.escape = escapeMarkdown;

  service.addRule("table", {
    filter: "table",
    replacement: (_content, node) => tableToMarkdown(node as HTMLTableElement, service),
  });
  service.addRule("strikethrough", {
    filter: (node) => ["DEL", "S", "STRIKE"].includes(node.nodeName),
    replacement: (content) => (content.trim() ? `~~${content}~~` : content),
  });
  service.addRule("taskListItem", {
    filter: (node) => node.nodeName === "INPUT" && (node as HTMLInputElement).type === "checkbox" && !!node.closest("li"),
    replacement: (_content, node) => {
      const mark = (node as HTMLInputElement).checked ? "[x]" : "[ ]";
      return /^\s/.test(node.nextSibling?.textContent ?? "") ? mark : `${mark} `;
    },
  });
  service.addRule("preWithoutCode", {
    filter: (node) => node.nodeName === "PRE" && node.firstChild?.nodeName !== "CODE",
    replacement: (_content, node) => {
      const element = node as HTMLElement;
      const classes = `${element.className} ${element.parentElement?.className ?? ""}`;
      const language = /(?:language|lang|highlight-source)-([\w+#-]+)/.exec(classes)?.[1] ?? "";
      const code = (element.textContent ?? "").replace(/\n$/, "");
      const fence = codeFence(code);
      return `\n\n${fence}${language}\n${code}\n${fence}\n\n`;
    },
  });
  service.addRule("dataImage", {
    filter: (node) => node.nodeName === "IMG" && (node.getAttribute("src") ?? "").startsWith("data:"),
    replacement: (_content, node) => escapeMarkdown((node as HTMLElement).getAttribute("alt") ?? ""),
  });
  // Script links stay as their text.
  service.addRule("unsafeLink", {
    filter: (node) => node.nodeName === "A" && /^\s*(javascript|vbscript|data):/i.test(node.getAttribute("href") ?? ""),
    replacement: (content) => content,
  });
  return service;
}

export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  tidyPastedHtml(doc.body);
  return createService().turndown(doc.body);
}
