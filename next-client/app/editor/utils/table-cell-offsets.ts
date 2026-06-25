import type { TableInfo } from "./table-detection";

// A cell's raw text plus its absolute char range in the *document* (not the
// line). `start`/`end` bracket the trimmed cell content, after the leading
// `| ` and before the trailing ` |`. `fullStart`/`fullEnd` bracket the whole
// pipe-to-pipe segment including padding — needed to render something that
// spans the full (possibly alignment-padded) column width, e.g. a formula
// result badge that should sit left/center/right exactly like the column's
// own alignment, not just where the trimmed text happened to be. `row`
// follows A1 numbering: 1 = header, 2 = rows[0], N = rows[N-2] — the
// markdown separator row consumes no row number, like a real spreadsheet.
export interface CellOffset {
  row: number;
  col: number;
  text: string;
  start: number;
  end: number;
  fullStart: number;
  fullEnd: number;
}

function isSeparatorRow(line: string): boolean {
  return /^\s*\|[\s:|-]+\|\s*$/.test(line);
}

// Splits a single table row line into cells with [start, end) offsets
// relative to that line, honoring escaped pipes (`\|`) the same way
// tableParser.ts's splitCells does — but without collapsing/replacing any
// characters, since we need real positions, not just trimmed text.
function splitCellsWithOffsets(
  line: string,
): { text: string; start: number; end: number; fullStart: number; fullEnd: number }[] {
  const segments: { raw: string; start: number; end: number }[] = [];
  let segStart = 0;
  let i = 0;
  const len = line.length;

  while (i < len) {
    if (line[i] === "\\" && line[i + 1] === "|") {
      i += 2;
      continue;
    }
    if (line[i] === "|") {
      segments.push({ raw: line.slice(segStart, i), start: segStart, end: i });
      segStart = i + 1;
    }
    i++;
  }
  segments.push({ raw: line.slice(segStart, len), start: segStart, end: len });

  let usable = segments;
  if (usable.length > 0 && usable[0].raw.trim() === "") usable = usable.slice(1);
  if (usable.length > 0 && usable[usable.length - 1].raw.trim() === "") usable = usable.slice(0, -1);

  return usable.map((seg) => {
    const leadingWs = seg.raw.length - seg.raw.replace(/^\s+/, "").length;
    const trimmed = seg.raw.trim();
    const start = seg.start + leadingWs;
    return { text: trimmed, start, end: start + trimmed.length, fullStart: seg.start, fullEnd: seg.end };
  });
}

export function getTableCellOffsets(
  tableInfo: Pick<TableInfo, "tableStart" | "tableEnd" | "tableStartOffset" | "lines">,
): CellOffset[] {
  const { tableStart, tableEnd, tableStartOffset, lines } = tableInfo;
  const result: CellOffset[] = [];
  let lineOffset = tableStartOffset;
  let a1Row = 1; // header row

  for (let li = tableStart; li <= tableEnd; li++) {
    const line = lines[li];
    if (li !== tableStart && isSeparatorRow(line)) {
      lineOffset += line.length + 1;
      continue;
    }
    const cells = splitCellsWithOffsets(line);
    for (let col = 0; col < cells.length; col++) {
      const c = cells[col];
      result.push({
        row: a1Row,
        col,
        text: c.text,
        start: lineOffset + c.start,
        end: lineOffset + c.end,
        fullStart: lineOffset + c.fullStart,
        fullEnd: lineOffset + c.fullEnd,
      });
    }
    a1Row++;
    lineOffset += line.length + 1;
  }

  return result;
}
