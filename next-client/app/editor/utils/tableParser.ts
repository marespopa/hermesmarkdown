export type Alignment = "left" | "center" | "right";

export interface TableData {
  headers: string[];
  rows: string[][];
  alignments: Alignment[];
}

// Private-use Unicode char — safe placeholder for escaped pipes during parsing
const ESC_PIPE = "";

function splitCells(line: string): string[] {
  // Replace \| with placeholder before splitting on |
  const safe = line.replace(/\\\|/g, ESC_PIPE);
  let parts = safe.split("|");

  // Drop empty leading/trailing parts from surrounding pipes
  if (parts[0].trim() === "") parts = parts.slice(1);
  if (parts.length > 0 && parts[parts.length - 1].trim() === "")
    parts = parts.slice(0, -1);

  return parts.map((c) => c.trim().replace(new RegExp(ESC_PIPE, "g"), "\\|"));
}

function isSeparatorCell(cell: string): boolean {
  return /^:?-+:?$/.test(cell.trim());
}

function parseAlignment(cell: string): Alignment {
  const t = cell.trim();
  if (t.startsWith(":") && t.endsWith(":")) return "center";
  if (t.endsWith(":")) return "right";
  return "left";
}

export function parseTable(source: string): TableData | null {
  const lines = source
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.includes("|"));

  if (lines.length < 2) return null;

  const headerCells = splitCells(lines[0]);
  if (headerCells.length === 0) return null;

  const sepCells = splitCells(lines[1]);
  if (sepCells.length === 0 || !sepCells.every(isSeparatorCell)) return null;

  const colCount = headerCells.length;

  const alignments: Alignment[] = sepCells.map(parseAlignment);
  while (alignments.length < colCount) alignments.push("left");

  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    const cells = splitCells(lines[i]);
    // Skip extra separator rows that might appear
    if (cells.length > 0 && cells.every(isSeparatorCell)) continue;

    const padded = [...cells];
    while (padded.length < colCount) padded.push("");
    rows.push(padded.slice(0, colCount));
  }

  return { headers: headerCells, rows, alignments };
}

// Lenient parse: no valid separator required. Treats first row as headers, rest
// as data. Used by the edit dialog so tables without a proper separator still
// open correctly.
export function parseTableLenient(source: string): TableData | null {
  const strict = parseTable(source);
  if (strict) return strict;

  const lines = source
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.includes("|"));

  if (lines.length < 1) return null;

  const headers = splitCells(lines[0]);
  if (headers.length === 0) return null;

  const colCount = headers.length;
  const rows = lines.slice(1).map((line) => {
    const cells = splitCells(line);
    while (cells.length < colCount) cells.push("");
    return cells.slice(0, colCount);
  });

  return {
    headers,
    rows,
    alignments: Array<Alignment>(colCount).fill("left"),
  };
}

export function extractTableSource(
  lines: string[],
  tableStart: number,
  tableEnd: number,
): string {
  return lines.slice(tableStart, tableEnd + 1).join("\n");
}
