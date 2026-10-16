// Embeds: a line holding only `![[Note]]` (or `![[Note#Heading]]`,
// optionally with `|alias`) or `/path.ext` shows that file, read-only, under
// the line: a note's text, a CSV as a table, an image, or a code file as a
// code block. Pure helpers shared by the editor widget
// (codemirror/note-embeds.ts), the loader hook (hooks/use-note-embeds.ts),
// Export as PDF and Export as Compiled Markdown.
import { FM_REGEX } from "@/app/utils/frontmatter-utils";
import { stripBoardFence } from "@/app/utils/board/board-format";
import { delimitedTextToMarkdownTable, detectDelimitedTable } from "./table-manipulation";

export type EmbedKind = "note" | "csv" | "image" | "code";

export interface EmbedRef {
  /** The note name or file path as written, e.g. `Specs/Roadmap` or `data/sales.csv`. */
  target: string;
  /** The heading after `#`, or null for the whole note (always null for other files). */
  heading: string | null;
  kind: EmbedKind;
}

const IMAGE_EXT = ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "bmp"];
const CODE_EXT = [
  "ts", "tsx", "js", "jsx", "mjs", "cjs", "py", "rb", "go", "rs", "java", "kt", "swift", "c", "h", "cpp", "hpp", "cs",
  "php", "sh", "bash", "zsh", "ps1", "json", "yaml", "yml", "toml", "ini", "sql", "css", "scss", "html", "xml", "lua",
  "r", "dart", "txt", "log",
];
const EXT = /\.([a-z0-9]{1,5})$/i;

const EMBED_LINE = /^!\[\[([^\]|#\n]+?)(?:#([^\]|\n]+?))?(?:\|[^\]\n]*)?\]\][ \t]*$/;
// `/chapter-1.md`, `/data/sales.csv`, `/assets/chart.png`: a path after one
// slash, nothing else.
const SLASH_LINE = /^\/([^/\s][^\n]*?\.[a-z0-9]{1,5})$/i;
const HEADING = /^(#{1,6})[ \t]+(.+?)[ \t#]*$/;
const FENCE = /^\s*(`{3,}|~{3,})/;

// The kind of file `target` names; null for a file type that can't be shown.
// No extension (or `.md`, `.board`) is a note.
function kindOf(target: string, slash: boolean): EmbedKind | null {
  const ext = EXT.exec(target)?.[1].toLowerCase();
  if (!ext || ext === "md") return "note";
  if (ext === "board") return slash ? null : "note";
  if (ext === "csv") return "csv";
  if (IMAGE_EXT.includes(ext)) return "image";
  if (CODE_EXT.includes(ext)) return "code";
  return null;
}

export function parseEmbedLine(line: string): EmbedRef | null {
  const text = line.trim();
  const slash = SLASH_LINE.exec(text);
  if (slash) {
    const kind = kindOf(slash[1], true);
    return kind ? { target: slash[1], heading: null, kind } : null;
  }
  const match = EMBED_LINE.exec(text);
  if (!match) return null;
  const target = match[1].trim();
  const kind = target ? kindOf(target, false) : null;
  if (!kind) return null;
  return { target, heading: kind === "note" ? match[2]?.trim() || null : null, kind };
}

export const embedKey = ({ target, heading }: EmbedRef) =>
  `${target.toLowerCase()}${heading ? `#${heading.toLowerCase()}` : ""}`;

/** The extension of a file name, lowercased ("" when none). */
export const fileExtension = (name: string) => EXT.exec(name)?.[1].toLowerCase() ?? "";

// A CSV (or tab-separated) file as a Markdown table, the first row as the
// header. Ragged rows are padded or cut to the header's width.
export function csvToMarkdownTable(text: string): string {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  if (!trimmed) return "";
  const delimiter = detectDelimitedTable(trimmed) ?? (trimmed.split("\n")[0].includes("\t") ? "\t" : ",");
  return delimitedTextToMarkdownTable(trimmed, delimiter);
}

// A code file as a fenced block, the fence longer than any backtick run in it.
export function codeToFence(code: string, fileName: string): string {
  const longest = Math.max(2, ...[...code.matchAll(/`+/g)].map((run) => run[0].length));
  const fence = "`".repeat(longest + 1);
  return `${fence}${fileExtension(fileName)}\n${code.replace(/\n$/, "")}\n${fence}`;
}

// The vault paths a file target (not a note) may mean, nearest first: next
// to the note, then from the vault root. A leading `/` is the vault root only.
export function fileCandidatePaths(target: string, fromPath: string | undefined): string[] {
  const clean = target.replace(/^\/+/, "");
  const folder = fromPath && fromPath !== "draft" ? fromPath.split("/").slice(0, -1).join("/") : "";
  return target.startsWith("/") || !folder ? [clean] : [`${folder}/${clean}`, clean];
}

// A vault path for `src` relative to the note's folder: "../a.png" from
// "journal/2026/x.md" is "journal/a.png"; "/a.png" is from the vault root.
// Null for web URLs and paths that leave the vault.
export function vaultImagePath(notePath: string, src: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(src);
  } catch {
    decoded = src;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(decoded)) return null;
  const parts = decoded.startsWith("/") ? [] : notePath.split("/").slice(0, -1);
  for (const segment of decoded.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (!parts.length) return null;
      parts.pop();
    } else {
      parts.push(segment);
    }
  }
  return parts.length ? parts.join("/") : null;
}

const IMAGE_LINK = /(!\[[^\]]*\]\(\s*<?)([^)\s>]+)/g;

// Relative image links in `markdown` (a note at `notePath`) rewritten from
// the vault root (`/assets/a.png`), so they still resolve once the text is
// placed inside another note.
export function rootImageLinks(markdown: string, notePath: string): string {
  return markdown.replace(IMAGE_LINK, (whole, open: string, src: string) => {
    if (src.startsWith("/")) return whole;
    const path = vaultImagePath(notePath, src);
    return path ? `${open}/${encodeURI(path)}` : whole;
  });
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

/** An embedded file, read: its vault path and text ("" for an image, which is only located). */
export interface EmbedFile {
  path: string;
  text: string;
}

/** Reads what `ref` names, relative to the note at `fromPath`; null when it can't be read or shown. */
export type ReadEmbed = (ref: EmbedRef, fromPath: string) => Promise<EmbedFile | null>;

/** How deep compiled embeds go; deeper ones stay as their lines. */
export const MAX_EMBED_DEPTH = 8;

// Export as PDF and Export as Compiled Markdown: each embed line becomes the
// file it names (a note's text with its own embeds filled in, a CSV as a
// table, a code file as a fenced block, an image as an image link from the
// vault root). A note already being filled in higher up, or one past
// MAX_EMBED_DEPTH, keeps its line, so no note can loop. Lines that can't be
// read stay as they are.
export async function expandEmbeds(
  markdown: string,
  fromPath: string,
  read: ReadEmbed,
  open: ReadonlySet<string> = new Set([fromPath.toLowerCase()]),
): Promise<string> {
  const embeds = findEmbeds(markdown);
  if (!embeds.length) return markdown;
  const lines = markdown.split("\n");
  for (const { line, ref } of embeds) {
    const file = await read(ref, fromPath);
    if (!file) continue;
    if (ref.kind === "image") {
      lines[line - 1] = `![${file.path.split("/").pop()}](/${encodeURI(file.path)})`;
    } else if (ref.kind === "csv") {
      lines[line - 1] = csvToMarkdownTable(file.text);
    } else if (ref.kind === "code") {
      lines[line - 1] = codeToFence(file.text, file.path);
    } else {
      const key = file.path.toLowerCase();
      if (open.has(key) || open.size > MAX_EMBED_DEPTH) continue;
      const section = embedSection(file.text, ref.heading);
      if (section === null) continue;
      const nested = await expandEmbeds(section, file.path, read, new Set([...open, key]));
      lines[line - 1] = rootImageLinks(nested, file.path);
    }
  }
  return lines.join("\n");
}
