// Note embeds: a line holding only `![[Note]]` (or `![[Note#Heading]]`,
// optionally with `|alias`) shows that note's text, read-only, under the
// line. Pure helpers shared by the editor widget (codemirror/note-embeds.ts),
// the loader hook (hooks/use-note-embeds.ts) and Export as PDF.
import { FM_REGEX } from "@/app/utils/frontmatter-utils";
import { stripBoardFence } from "@/app/utils/board/board-format";

export interface EmbedRef {
  /** The note name or path as written, e.g. `Specs/Roadmap`. */
  target: string;
  /** The heading after `#`, or null for the whole note. */
  heading: string | null;
}

const EMBED_LINE = /^!\[\[([^\]|#\n]+?)(?:#([^\]|\n]+?))?(?:\|[^\]\n]*)?\]\][ \t]*$/;
// Images and other files embedded by name (`![[diagram.png]]`) aren't notes.
const NON_NOTE_FILE = /\.(?!md$|board$)[a-z0-9]{1,5}$/i;
const HEADING = /^(#{1,6})[ \t]+(.+?)[ \t#]*$/;
const FENCE = /^\s*(`{3,}|~{3,})/;

export function parseEmbedLine(line: string): EmbedRef | null {
  const match = EMBED_LINE.exec(line.trim());
  if (!match) return null;
  const target = match[1].trim();
  if (!target || NON_NOTE_FILE.test(target)) return null;
  return { target, heading: match[2]?.trim() || null };
}

export const embedKey = ({ target, heading }: EmbedRef) =>
  `${target.toLowerCase()}${heading ? `#${heading.toLowerCase()}` : ""}`;

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

// Export as PDF: each embed line becomes the embedded text, one level deep
// (embeds inside it print as their names), so no note can loop. `read`
// resolves a target to its Markdown, or null when it can't be read.
export async function expandEmbeds(
  markdown: string,
  read: (target: string) => Promise<string | null>,
): Promise<string> {
  const embeds = findEmbeds(markdown);
  if (!embeds.length) return markdown;
  const lines = markdown.split("\n");
  const texts = new Map<string, string | null>();
  for (const { ref } of embeds) {
    if (!texts.has(ref.target.toLowerCase())) texts.set(ref.target.toLowerCase(), await read(ref.target));
  }
  for (const { line, ref } of embeds) {
    const text = texts.get(ref.target.toLowerCase());
    const section = text == null ? null : embedSection(text, ref.heading);
    if (section !== null) lines[line - 1] = section;
  }
  return lines.join("\n");
}
