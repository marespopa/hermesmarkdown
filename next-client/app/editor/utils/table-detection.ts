export interface TableInfo {
  tableStart: number;
  tableEnd: number;
  lineIdx: number;
  cursorRow: number;
  cursorCol: number;
  tableStartOffset: number;
  lines: string[];
}

function isTableLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.indexOf("|", 1) !== -1;
}

function cursorColInLine(line: string, posInLine: number): number {
  // Count the number of | characters before the cursor position (excluding the leading |)
  const segment = line.substring(0, posInLine);
  const pipes = segment.split("|").length - 1;
  // The first | is the row-opening delimiter, so column index = pipes - 1, min 0
  return Math.max(0, pipes - 1);
}

export interface TableBlock {
  tableStart: number;
  tableEnd: number;
  tableStartOffset: number;
  lines: string[];
}

// Every table block in the document, not just the one under the cursor —
// used to render live formula results everywhere, regardless of where the
// caret currently is.
export function findAllTables(text: string): TableBlock[] {
  const lines = text.split("\n");
  const blocks: TableBlock[] = [];
  let offset = 0;
  let i = 0;

  while (i < lines.length) {
    if (isTableLine(lines[i])) {
      const tableStart = i;
      const tableStartOffset = offset;
      while (i < lines.length && isTableLine(lines[i])) {
        offset += lines[i].length + 1;
        i++;
      }
      blocks.push({ tableStart, tableEnd: i - 1, tableStartOffset, lines });
    } else {
      offset += lines[i].length + 1;
      i++;
    }
  }

  return blocks;
}

export function findTableAtPos(text: string, pos: number): TableInfo | null {
  const lines = text.split("\n");

  // Find which line the cursor is on and its start offset
  let charCount = 0;
  let lineIdx = lines.length - 1;
  let lineStartOffset = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineEnd = charCount + lines[i].length;
    if (pos <= lineEnd) {
      lineIdx = i;
      lineStartOffset = charCount;
      break;
    }
    charCount += lines[i].length + 1; // +1 for \n
  }

  if (!isTableLine(lines[lineIdx])) return null;

  // Walk up to find table start
  let tableStart = lineIdx;
  while (tableStart > 0 && isTableLine(lines[tableStart - 1])) {
    tableStart--;
  }

  // Walk down to find table end
  let tableEnd = lineIdx;
  while (tableEnd < lines.length - 1 && isTableLine(lines[tableEnd + 1])) {
    tableEnd++;
  }

  // Compute char offset of the table's first character
  let tableStartOffset = 0;
  for (let i = 0; i < tableStart; i++) {
    tableStartOffset += lines[i].length + 1;
  }

  const posInLine = pos - lineStartOffset;
  const cursorCol = cursorColInLine(lines[lineIdx], posInLine);
  const cursorRow = lineIdx - tableStart;

  return { tableStart, tableEnd, lineIdx, cursorRow, cursorCol, tableStartOffset, lines };
}
