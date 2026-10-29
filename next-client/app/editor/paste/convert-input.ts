import { delimitedTextToMarkdownTable, detectDelimitedTable, parseDelimitedText } from "@/app/editor/utils/table-manipulation";
import { cleanMarkdown, type CleanResult } from "./clean-markdown";
import { htmlToMarkdown } from "./html-to-markdown";

// The Markdown Cleaner's pipeline: work out what was pasted (or take the
// format the reader chose), convert HTML or CSV/TSV to Markdown, then run
// the clean pass over the result.

export type InputFormat = "markdown" | "html" | "csv";
export type FormatChoice = "auto" | InputFormat;

export const FORMAT_LABELS: Record<InputFormat, string> = {
  markdown: "Markdown",
  html: "HTML",
  csv: "CSV/TSV",
};

// A line that only Markdown would start with.
const MARKDOWN_LINE = /^\s{0,3}(#{1,6}\s|[-*+]\s|\d+[.)]\s|>|```|~~~|\|)/m;

export function detectFormat(text: string): InputFormat {
  const trimmed = text.trim();
  if (!trimmed) return "markdown";
  const markdownLines = MARKDOWN_LINE.test(text);
  if (trimmed.startsWith("<") && !markdownLines && (trimmed.match(/<\/?[a-z][^>]*>/gi)?.length ?? 0) >= 2) {
    return "html";
  }
  const delimiter = detectDelimitedTable(text);
  if (delimiter && !markdownLines) {
    // Prose with a comma per line isn't a table: CSV cells are short.
    const cells = parseDelimitedText(text, delimiter).flat();
    if (delimiter === "\t" || cells.every((cell) => cell.trim().length <= 60)) return "csv";
  }
  return "markdown";
}

export interface ConvertResult extends CleanResult {
  format: InputFormat;
}

export function convertInput(text: string, choice: FormatChoice): ConvertResult {
  const format = choice === "auto" ? detectFormat(text) : choice;
  if (!text.trim()) return { markdown: "", fixes: [], format };
  let markdown = text;
  if (format === "html") {
    markdown = htmlToMarkdown(text);
  } else if (format === "csv") {
    const delimiter = detectDelimitedTable(text) ?? (text.includes("\t") ? "\t" : ",");
    markdown = delimitedTextToMarkdownTable(text, delimiter);
  }
  return { ...cleanMarkdown(markdown), format };
}
