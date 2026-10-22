// Finds `[[wikilinks]]` (and `![[embeds]]`) in note text with exact offsets,
// skipping fenced code blocks and inline code spans. Frontmatter is scanned
// too (`related: "[[X]]"` is a link).

export interface WikiLinkTarget {
  target: string;
  heading: string | null;
  alias: string | null;
}

/** `Note#H|alias` → { target: "Note", heading: "H", alias: "alias" }; trims target. */
export function parseLinkTarget(raw: string): WikiLinkTarget {
  const pipe = raw.indexOf("|");
  const alias = pipe >= 0 ? raw.slice(pipe + 1) : null;
  const head = pipe >= 0 ? raw.slice(0, pipe) : raw;
  const hash = head.indexOf("#");
  const heading = hash >= 0 ? head.slice(hash + 1) : null;
  const target = (hash >= 0 ? head.slice(0, hash) : head).trim();
  return { target, heading, alias };
}

export interface WikiLinkOccurrence extends WikiLinkTarget {
  from: number;
  to: number;
  targetFrom: number;
  targetTo: number;
  embed: boolean;
}

const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const LINK = /\[\[([^\]\n]+)\]\]/g;

// Replaces inline code spans (matching backtick runs) with spaces, same length.
function maskInlineCode(line: string): string {
  if (!line.includes("`")) return line;
  let out = "";
  let i = 0;
  while (i < line.length) {
    if (line[i] !== "`") {
      out += line[i++];
      continue;
    }
    let run = 0;
    while (line[i + run] === "`") run++;
    let j = i + run;
    let close = -1;
    while (j < line.length) {
      if (line[j] === "`") {
        let r = 0;
        while (line[j + r] === "`") r++;
        if (r === run) {
          close = j;
          break;
        }
        j += r;
      } else j++;
    }
    if (close < 0) {
      out += line.slice(i, i + run);
      i += run;
    } else {
      out += " ".repeat(close + run - i);
      i = close + run;
    }
  }
  return out;
}

/** Every [[…]] outside fenced code and inline code spans, in order. */
export function scanWikiLinks(text: string): WikiLinkOccurrence[] {
  const result: WikiLinkOccurrence[] = [];
  let fence: string | null = null;
  let offset = 0;
  for (const line of text.split("\n")) {
    const lineStart = offset;
    offset += line.length + 1;
    const fenceMatch = FENCE.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
      continue;
    }
    if (fence || !line.includes("[[")) continue;
    const masked = maskInlineCode(line);
    LINK.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = LINK.exec(masked))) {
      const raw = line.slice(match.index + 2, match.index + 2 + match[1].length);
      const innerStart = lineStart + match.index + 2;
      const stop = raw.search(/[#|]/);
      const head = stop >= 0 ? raw.slice(0, stop) : raw;
      const lead = head.length - head.trimStart().length;
      const embed = match.index > 0 && line[match.index - 1] === "!";
      result.push({
        ...parseLinkTarget(raw),
        from: lineStart + match.index - (embed ? 1 : 0),
        to: lineStart + match.index + match[0].length,
        targetFrom: innerStart + lead,
        targetTo: innerStart + lead + head.trim().length,
        embed,
      });
    }
  }
  return result;
}

/** 1-based line and 0-based column of an offset. */
export function lineColumnAt(text: string, offset: number): { line: number; column: number } {
  const before = text.slice(0, offset);
  const lastNewline = before.lastIndexOf("\n");
  let line = 1;
  for (let i = 0; i < before.length; i++) if (before[i] === "\n") line++;
  return { line, column: offset - (lastNewline + 1) };
}
