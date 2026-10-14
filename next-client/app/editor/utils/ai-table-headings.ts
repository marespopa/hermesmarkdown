import { isTableLine } from "./table-detection";

// A table is named by the heading right above it, with only blank lines
// between them (findHeadingAbove in table-detection.ts), so formulas like
// =Income!B3 can find it. AI output often puts a one-paragraph description
// under the heading; this moves that one block of text to just below the
// table, so the table keeps its name. Applied to AI text before it goes into
// a note (useAIEditorActions). A heading followed by several paragraphs and
// then a table is left as it is: that's prose, not a caption.

const HEADING = /^#{1,6}\s+\S/;
const FENCE = /^\s*(```|~~~)/;

const isBlank = (line: string) => line.trim() === "";

// Whether each line is inside (or opens/closes) a fenced code block.
function fencedLines(lines: string[]): boolean[] {
  let marker: string | null = null;
  return lines.map((line) => {
    const fence = FENCE.exec(line)?.[1];
    if (marker === null) {
      if (fence) marker = fence;
      return marker !== null;
    }
    if (fence === marker) marker = null;
    return true;
  });
}

interface Move {
  heading: number;
  blockStart: number;
  blockEnd: number;
  tableStart: number;
  tableEnd: number;
}

// The first table at or after `from` with exactly one block of text between
// it and the heading above it.
function findMove(lines: string[], from: number): Move | null {
  const fenced = fencedLines(lines);
  const isTable = (i: number) => !fenced[i] && isTableLine(lines[i]);
  for (let t = Math.max(from, 0); t < lines.length; t++) {
    if (!isTable(t) || (t > 0 && isTable(t - 1))) continue;
    let tableEnd = t;
    while (tableEnd + 1 < lines.length && isTable(tableEnd + 1)) tableEnd++;

    let k = t - 1;
    while (k >= 0 && isBlank(lines[k])) k--;
    const blockEnd = k;
    // The block may sit right under the heading, with no blank line.
    while (k >= 0 && !isBlank(lines[k]) && !HEADING.test(lines[k].trim())) k--;
    const blockStart = k + 1;
    while (k >= 0 && isBlank(lines[k])) k--;
    const heading = k;

    const block = lines.slice(blockStart, blockEnd + 1);
    const isCaption =
      blockEnd >= blockStart &&
      heading >= 0 &&
      !fenced[heading] &&
      HEADING.test(lines[heading].trim()) &&
      block.every((line, i) => !fenced[blockStart + i] && !HEADING.test(line.trim()) && !isTableLine(line));
    if (isCaption) return { heading, blockStart, blockEnd, tableStart: t, tableEnd };
    t = tableEnd;
  }
  return null;
}

export function keepTablesUnderHeadings(markdown: string): string {
  let lines = markdown.split("\n");
  let from = 0;
  for (let move = findMove(lines, from); move; move = findMove(lines, from)) {
    const { heading, blockStart, blockEnd, tableStart, tableEnd } = move;
    const rest = lines.slice(tableEnd + 1);
    const moved = [
      ...lines.slice(0, heading + 1),
      "",
      ...lines.slice(tableStart, tableEnd + 1),
      "",
      ...lines.slice(blockStart, blockEnd + 1),
    ];
    from = moved.length;
    lines = [...moved, ...(rest.length > 0 && !isBlank(rest[0]) ? [""] : []), ...rest];
  }
  return lines.join("\n");
}
