// Embeds: a line holding only `![[Note]]` (or `![[Note#Heading]]`,
// optionally with `|alias`), `/Note.md` or `/data.csv` shows that note's
// text, or the CSV as a table, read-only, under the line. Pure helpers
// shared by the editor widget (codemirror/note-embeds.ts), the loader hook
// (hooks/use-note-embeds.ts) and Export as PDF.
import { FM_REGEX } from "@/app/utils/frontmatter-utils";
import { stripBoardFence } from "@/app/utils/board/board-format";
import { delimitedTextToMarkdownTable, detectDelimitedTable } from "./table-manipulation";

export interface EmbedRef {
  /** The note name or path as written, e.g. `Specs/Roadmap` or `data/sales.csv`. */
  target: string;
  /** The heading after `#`, or null for the whole note (always null for a CSV). */
  heading: string | null;
  kind: "note" | "csv";
}

const EMBED_LINE = /^!\[\[([^\]|#\n]+?)(?:#([^\]|\n]+?))?(?:\|[^\]\n]*)?\]\][ \t]*$/;
// `/chapter-1.md`, `/data/sales.csv`: a path after one slash, nothing else.
const SLASH_LINE = /^\/([^/\s][^\n]*?\.(?:md|csv))$/i;
const CSV_FILE = /\.csv$/i;
// Images and other files embedded by name (`![[diagram.png]]`) aren't notes.
const NON_NOTE_FILE = /\.(?!md$|board$|csv$)[a-z0-9]{1,5}$/i;
const HEADING = /^(#{1,6})[ \t]+(.+?)[ \t#]*$/;
const FENCE = /^\s*(`{3,}|~{3,})/;

export function parseEmbedLine(line: string): EmbedRef | null {
  const text = line.trim();
  const slash = SLASH_LINE.exec(text);
  if (slash) return { target: slash[1], heading: null, kind: CSV_FILE.test(slash[1]) ? "csv" : "note" };
  const match = EMBED_LINE.exec(text);
  if (!match) return null;
  const target = match[1].trim();
  if (!target || NON_NOTE_FILE.test(target)) return null;
  const kind = CSV_FILE.test(target) ? "csv" : "note";
  return { target, heading: kind === "csv" ? null : match[2]?.trim() || null, kind };
}

export const embedKey = ({ target, heading }: EmbedRef) =>
  `${target.toLowerCase()}${heading ? `#${heading.toLowerCase()}` : ""}`;

// A CSV (or tab-separated) file as a Markdown table, the first row as the
// header. Ragged rows are padded or cut to the header's width.
export function csvToMarkdownTable(text: string): string {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  if (!trimmed) return "";
  const delimiter = detectDelimitedTable(trimmed) ?? (trimmed.split("\n")[0].includes("\t") ? "\t" : ",");
  return delimitedTextToMarkdownTable(trimmed, delimiter);
}

// The vault paths a CSV target may mean, nearest first: next to the note,
// then from the vault root. A leading `/` is the vault root only.
export function csvCandidatePaths(target: string, fromPath: string | undefined): string[] {
  const clean = target.replace(/^\/+/, "");
  const folder = fromPath && fromPath !== "draft" ? fromPath.split("/").slice(0, -1).join("/") : "";
  return target.startsWith("/") || !folder ? [clean] : [`${folder}/${clean}`, clean];
}

// Every embed line outside fenced code, in document order.
export function findEmbeds(markdown: string): { line: number; ref: EmbedRef }[] {
  const found: { line: number; ref: EmbedRef }[] = [];
  let fence: string | null = null;
  markdown.split("\n").forEach((text, index) => {
    const open = FENCE.exec(text);
    if (open) {
      if (!fence) fence = open[1][0];
      else if (open[1][0] === fence && text.trim().replace(/[`~]/g, "") === "") fence = null;
      return;
    }
    if (fence) return;
    const ref = parseEmbedLine(text);
    if (ref) found.push({ line: index + 1, ref });
  });
  return found;
}

// The part of `markdown` an embed shows: the note without frontmatter or
// board scene, or only the section under `heading` (the heading line through
// the next heading of the same or a higher level). Null when the heading
// isn't there.
export function embedSection(markdown: string, heading: string | null): string | null {
  const body = stripBoardFence(markdown.replace(/\r\n?/g, "\n").replace(FM_REGEX, ""));
  if (!heading) return body.replace(/\n{3,}/g, "\n\n").trim();
  const lines = body.split("\n");
  const wanted = heading.toLowerCase();
  let start = -1;
  let level = 0;
  let fence = false;
  for (let i = 0; i < lines.length; i++) {
    if (FENCE.test(lines[i])) fence = !fence;
    if (fence) continue;
    const match = HEADING.exec(lines[i]);
    if (!match) continue;
    if (start === -1) {
      if (match[2].trim().toLowerCase() === wanted) {
        start = i;
        level = match[1].length;
      }
    } else if (match[1].length <= level) {
      return lines.slice(start, i).join("\n").trim();
    }
  }
  return start === -1 ? null : lines.slice(start).join("\n").trim();
}

// Export as PDF: each embed line becomes the embedded text (a CSV as a
// table), one level deep (embeds inside it print as their names), so no note
// can loop. `read` resolves a reference to its file's text, or null when it
// can't be read.
export async function expandEmbeds(
  markdown: string,
  read: (ref: EmbedRef) => Promise<string | null>,
): Promise<string> {
  const embeds = findEmbeds(markdown);
  if (!embeds.length) return markdown;
  const lines = markdown.split("\n");
  const texts = new Map<string, string | null>();
  for (const { ref } of embeds) {
    if (!texts.has(ref.target.toLowerCase())) texts.set(ref.target.toLowerCase(), await read(ref));
  }
  for (const { line, ref } of embeds) {
    const text = texts.get(ref.target.toLowerCase());
    const section = text == null ? null : ref.kind === "csv" ? csvToMarkdownTable(text) : embedSection(text, ref.heading);
    if (section !== null) lines[line - 1] = section;
  }
  return lines.join("\n");
}
