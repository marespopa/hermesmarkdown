function parseRow(line: string): string[] {
  const parts = line.split("|");
  // Drop first and last (empty strings from leading/trailing |)
  return parts.slice(1, parts.length - 1).map((c) => c.trim());
}

function isSeparatorRow(line: string): boolean {
  return /^\s*\|[\s:|-]+\|\s*$/.test(line);
}

function serializeRow(cells: string[]): string {
  const padded = cells.map((c) => ` ${c.padEnd(Math.max(c.length, 6), " ")} `);
  return `|${padded.join("|")}|`;
}

function serializeSeparator(cells: string[]): string {
  const padded = cells.map((c) => ` ${c.padEnd(Math.max(c.length, 8), "-")} `);
  return `|${padded.join("|")}|`;
}

export function addRow(lines: string[], tableEnd: number): string[] {
  // Determine column count from the last data row in the table
  const lastDataLine = lines[tableEnd];
  const cols = parseRow(lastDataLine).length;
  const newRow = serializeRow(Array(cols).fill(""));
  const result = [...lines];
  result.splice(tableEnd + 1, 0, newRow);
  return result;
}

// Insert an empty row immediately after `insertAfterLineIdx` in the full
// lines array. Column count is inferred from the referenced line.
export function insertRowAt(lines: string[], insertAfterLineIdx: number): string[] {
  const refLine = lines[insertAfterLineIdx];
  const cols = parseRow(refLine).length;
  const newRow = serializeRow(Array(cols).fill(""));
  const result = [...lines];
  result.splice(insertAfterLineIdx + 1, 0, newRow);
  return result;
}

// Insert an empty column immediately after `colIdx` (0-based) in every row
// of the table spanning `tableStart..tableEnd`.
export function insertColumnAt(
  lines: string[],
  colIdx: number,
  tableStart: number,
  tableEnd: number,
): string[] {
  const result = [...lines];
  for (let i = tableStart; i <= tableEnd; i++) {
    const isSep = isSeparatorRow(result[i]);
    const cells = parseRow(result[i]);
    cells.splice(colIdx + 1, 0, isSep ? " -------- " : "");
    result[i] = isSep ? serializeSeparator(cells) : serializeRow(cells);
  }
  return result;
}

export function addColumn(lines: string[], tableStart: number, tableEnd: number): string[] {
  const result = [...lines];
  for (let i = tableStart; i <= tableEnd; i++) {
    if (isSeparatorRow(result[i])) {
      result[i] = result[i].replace(/\|\s*$/, "| -------- |");
    } else {
      result[i] = result[i].replace(/\|\s*$/, "|          |");
    }
  }
  return result;
}

export function removeRow(lines: string[], lineIdx: number, tableStart: number): string[] {
  // Protect header row and separator row
  if (lineIdx === tableStart || lineIdx === tableStart + 1) return lines;
  const result = [...lines];
  result.splice(lineIdx, 1);
  return result;
}

export function removeColumn(
  lines: string[],
  colIdx: number,
  tableStart: number,
  tableEnd: number,
): string[] {
  const result = [...lines];
  for (let i = tableStart; i <= tableEnd; i++) {
    const isSep = isSeparatorRow(result[i]);
    const cells = parseRow(result[i]);
    if (colIdx < 0 || colIdx >= cells.length) continue;
    cells.splice(colIdx, 1);
    result[i] = isSep ? serializeSeparator(cells) : serializeRow(cells);
  }
  return result;
}

type Alignment = "none" | "left" | "center" | "right";

function detectAlignment(cell: string): Alignment {
  const t = cell.trim();
  if (t.startsWith(":") && t.endsWith(":")) return "center";
  if (t.endsWith(":")) return "right";
  if (t.startsWith(":")) return "left";
  return "none";
}

function nextAlignment(current: Alignment): Alignment {
  const cycle: Alignment[] = ["none", "left", "center", "right"];
  const idx = cycle.indexOf(current);
  return cycle[(idx + 1) % cycle.length];
}

function alignmentToSeparator(alignment: Alignment): string {
  switch (alignment) {
    case "left":   return ":-------";
    case "center": return ":------:";
    case "right":  return "-------:";
    default:       return "--------";
  }
}

export function cycleAlignment(
  lines: string[],
  colIdx: number,
  tableStart: number,
): { lines: string[]; newAlignment: Alignment } {
  const result = [...lines];
  const sepIdx = tableStart + 1;
  const cells = parseRow(result[sepIdx]);
  if (colIdx < 0 || colIdx >= cells.length) return { lines: result, newAlignment: "none" };

  const current = detectAlignment(cells[colIdx]);
  const next = nextAlignment(current);
  cells[colIdx] = alignmentToSeparator(next);
  result[sepIdx] = serializeSeparator(cells);
  return { lines: result, newAlignment: next };
}

export function getColumnAlignment(lines: string[], colIdx: number, tableStart: number): Alignment {
  const sepIdx = tableStart + 1;
  if (sepIdx >= lines.length) return "none";
  const cells = parseRow(lines[sepIdx]);
  if (colIdx < 0 || colIdx >= cells.length) return "none";
  return detectAlignment(cells[colIdx]);
}

function escapeCSVCell(cell: string): string {
  if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

export function tableToCSV(lines: string[], tableStart: number, tableEnd: number): string {
  const rows: string[] = [];
  for (let i = tableStart; i <= tableEnd; i++) {
    if (isSeparatorRow(lines[i])) continue;
    const cells = parseRow(lines[i]).map(escapeCSVCell);
    rows.push(cells.join(","));
  }
  return rows.join("\n");
}
