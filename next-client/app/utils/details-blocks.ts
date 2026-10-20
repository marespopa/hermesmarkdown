import { FM_REGEX } from "./frontmatter-utils";

// Finds raw HTML `<details><summary>…</summary> … </details>` sections in a
// note by scanning lines. The Markdown tree can't do this: Lezer splits the
// content at blank lines into separate HTML and paragraph nodes, so it gives
// no section boundaries. Shared by the editor's fold (codemirror/details-fold.ts)
// and Export as PDF / HTML (print/note-html.ts).

export interface DetailsBlock {
  /** 0-based line index of the `<details…>` line. */
  openLine: number;
  /** Offset of `<details`. */
  openFrom: number;
  /** Offset just past the opening tag's `>`. */
  openTagTo: number;
  /** Has an `open` attribute. */
  open: boolean;
  /** The summary's line, or `openLine` without a summary. */
  headerLine: number;
  /** Offset of the header line's end (before its newline). */
  headerLineEnd: number;
  summary: { tagFrom: number; textFrom: number; textTo: number; tagTo: number; text: string } | null;
  /** Just past `</summary>` (or the opening tag without a summary). */
  bodyFrom: number;
  closeLine: number;
  /** Offset of `</details>`. */
  closeFrom: number;
  /** Offset just past `</details>`. */
  closeTo: number;
  /** Offset of the closing line's end. */
  closeLineEnd: number;
}

type OpenBlock = Omit<DetailsBlock, "closeLine" | "closeFrom" | "closeTo" | "closeLineEnd">;

const REGEX_OPEN = /^ {0,3}<details(?=[\s>])([^>]*)>/i;
// `<summary…>text</summary>` at the start of `rest`, after only whitespace.
const REGEX_SUMMARY = /^(\s*)<summary(?=[\s>])[^>]*>(.*?)<\/summary\s*>/i;
const REGEX_CLOSE = /<\/details\s*>/gi;
const REGEX_FENCE = /^ {0,3}(`{3,}|~{3,})/;
/** The `open` attribute inside a tag's attribute string. */
export const REGEX_DETAILS_OPEN_ATTR = /\s+open(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?(?=[\s>/]|$)/i;

function summaryText(inner: string): string {
  return inner
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

// The summary found at `rest` (the text of a line from `restFrom`), if any.
function summaryAt(rest: string, restFrom: number): NonNullable<DetailsBlock["summary"]> | null {
  const match = REGEX_SUMMARY.exec(rest);
  if (!match) return null;
  const tagFrom = restFrom + match[1].length;
  const textFrom = restFrom + rest.indexOf(">", match[1].length) + 1;
  return { tagFrom, textFrom, textTo: textFrom + match[2].length, tagTo: restFrom + match[0].length, text: summaryText(match[2]) };
}

/** Every closed `<details>` block in `doc`, outer before inner, in document order. */
export function findDetailsBlocks(doc: string): DetailsBlock[] {
  if (!/<details/i.test(doc)) return [];
  const lines = doc.split("\n");
  const starts: number[] = [];
  let offset = 0;
  for (const line of lines) {
    starts.push(offset);
    offset += line.length + 1;
  }
  const lineEnd = (idx: number) => starts[idx] + lines[idx].length;

  const frontmatterEnd = FM_REGEX.exec(doc)?.[0].length ?? 0;
  const stack: OpenBlock[] = [];
  const blocks: DetailsBlock[] = [];
  let fence: { char: string; size: number } | null = null;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const lineStart = starts[idx];
    if (lineStart < frontmatterEnd) continue;
    const fenceMatch = REGEX_FENCE.exec(line);
    if (fence) {
      if (fenceMatch && fenceMatch[1][0] === fence.char && fenceMatch[1].length >= fence.size) fence = null;
      continue;
    }
    if (fenceMatch) {
      fence = { char: fenceMatch[1][0], size: fenceMatch[1].length };
      continue;
    }
    if (line.trimStart().startsWith(">")) continue;

    const opening = REGEX_OPEN.exec(line);
    if (opening) {
      const tagEnd = opening[0].length;
      const openTagTo = lineStart + tagEnd;
      const rest = line.slice(tagEnd);
      let summary = summaryAt(rest, openTagTo);
      let headerLine = idx;
      if (!summary && !rest.trim()) {
        let next = idx + 1;
        while (next < lines.length && !lines[next].trim()) next++;
        if (next < lines.length && /^ {0,3}</.test(lines[next])) {
          const indent = lines[next].length - lines[next].trimStart().length;
          summary = summaryAt(lines[next].slice(indent), starts[next] + indent);
          if (summary) headerLine = next;
        }
      }
      stack.push({
        openLine: idx,
        openFrom: lineStart + line.indexOf("<"),
        openTagTo,
        open: REGEX_DETAILS_OPEN_ATTR.test(opening[1]),
        headerLine,
        headerLineEnd: lineEnd(headerLine),
        summary,
        bodyFrom: summary ? summary.tagTo : openTagTo,
      });
    }

    for (const close of line.matchAll(REGEX_CLOSE)) {
      const closeFrom = lineStart + close.index;
      const top = stack[stack.length - 1];
      if (!top || closeFrom < top.bodyFrom) continue;
      stack.pop();
      blocks.push({ ...top, closeLine: idx, closeFrom, closeTo: closeFrom + close[0].length, closeLineEnd: lineEnd(idx) });
    }
  }
  return blocks.sort((a, b) => a.openFrom - b.openFrom);
}

/** `blocks` without those nested inside another (for rendering one level at a time). */
export function outermostDetailsBlocks(blocks: DetailsBlock[]): DetailsBlock[] {
  const out: DetailsBlock[] = [];
  let end = -1;
  for (const block of blocks) {
    if (block.openFrom < end) continue;
    out.push(block);
    end = block.closeTo;
  }
  return out;
}
