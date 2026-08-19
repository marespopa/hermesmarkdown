export type SortDirection = "asc" | "desc" | "none";

export interface SortState {
  colIdx: number;
  direction: Exclude<SortDirection, "none">;
}

export type ColType = "number" | "date" | "string";

// A row starting a cell with "=" (Markdown table formula/summary syntax,
// e.g. a `=SUM(...)` row) is a computed summary, not data, and should stay
// pinned rather than participate in sorting.
function isFormulaCell(text: string): boolean {
  if (!text) return false;
  const t = text.trim();
  return t.startsWith("=") && t.length > 1;
}

function isSummaryRow(row: string[]): boolean {
  return row.some((c) => isFormulaCell(c));
}

export function detectColumnType(rows: string[][], colIdx: number): ColType {
  const isEmpty = (v: string) => v.trim() === "";
  const nonEmpty = rows
    .filter((r) => !isSummaryRow(r))
    .map((r) => r[colIdx] ?? "")
    .filter((v) => !isEmpty(v));

  if (nonEmpty.length === 0) return "string";

  // Check if all are valid numbers/currencies
  const isNumeric = nonEmpty.every((v) => {
    // Strip currency symbols, thousands separators, spaces, and trailing alpha suffixes (e.g. "RON", "USD")
    const clean = v.replace(/[$€£¥%\s,]/g, "").replace(/[A-Z]{2,4}$/i, "").trim();
    return clean !== "" && !isNaN(Number(clean));
  });

  if (isNumeric) return "number";

  // Check if all are valid dates
  const isDate = nonEmpty.every((v) => {
    const d = Date.parse(v);
    // Ensure it's not just a generic number being parsed as a date
    return !isNaN(d) && isNaN(Number(v));
  });

  if (isDate) return "date";

  return "string";
}

// Generic sort core shared by sortRows (works on plain string[][] rows, used
// by the CodeMirror table toolbar). Returns the original indices of `rows`
// in sorted order rather than the rows themselves, so callers can reorder
// whatever row representation they hold.
export function sortRowIndices<T>(
  rows: T[],
  getCellText: (row: T, colIdx: number) => string | undefined,
  colIdx: number,
  direction: Exclude<SortDirection, "none">,
): number[] {
  const isEmpty = (v: string) => v.trim() === "";
  const cellTextAt = (i: number) => getCellText(rows[i], colIdx) ?? "";

  // Summary rows (containing a formula) are computed, not data — never sort
  // them, always keep them pinned after the sorted data rows.
  const indices = rows.map((_, i) => i);
  const dataIndices = indices.filter((i) => !isFormulaCell(cellTextAt(i)) && !isSummaryRowIdx(rows, getCellText, i));
  const summaryIndices = indices.filter((i) => isSummaryRowIdx(rows, getCellText, i));
  const colType = detectColumnTypeFromTexts(dataIndices.map((i) => cellTextAt(i)));

  const sorted = [...dataIndices].sort((ia, ib) => {
    const av = cellTextAt(ia);
    const bv = cellTextAt(ib);

    // Empty cells always go to the bottom regardless of direction
    if (isEmpty(av) && isEmpty(bv)) return 0;
    if (isEmpty(av)) return 1;
    if (isEmpty(bv)) return -1;

    let cmp = 0;
    if (colType === "number") {
      const numA = Number(av.replace(/[$€£¥%\s,]/g, "").replace(/[A-Z]{2,4}$/i, "").trim());
      const numB = Number(bv.replace(/[$€£¥%\s,]/g, "").replace(/[A-Z]{2,4}$/i, "").trim());
      cmp = numA - numB;
    } else if (colType === "date") {
      cmp = Date.parse(av) - Date.parse(bv);
    } else {
      cmp = av.localeCompare(bv);
    }

    return direction === "asc" ? cmp : -cmp;
  });

  return [...sorted, ...summaryIndices];
}

function isSummaryRowIdx<T>(rows: T[], getCellText: (row: T, colIdx: number) => string | undefined, idx: number): boolean {
  const row = rows[idx];
  // A row is a summary row if any of its cells (up to a reasonable column
  // scan) is a formula cell — mirrors isSummaryRow's `row.some(...)` over
  // string[][], but rows here may not be plain arrays.
  for (let c = 0; ; c++) {
    const text = getCellText(row, c);
    if (text === undefined) break;
    if (isFormulaCell(text)) return true;
    if (c > 64) break;
  }
  return false;
}

function detectColumnTypeFromTexts(texts: string[]): ColType {
  const isEmpty = (v: string) => v.trim() === "";
  const nonEmpty = texts.filter((v) => !isEmpty(v));

  if (nonEmpty.length === 0) return "string";

  const isNumeric = nonEmpty.every((v) => {
    const clean = v.replace(/[$€£¥%\s,]/g, "").replace(/[A-Z]{2,4}$/i, "").trim();
    return clean !== "" && !isNaN(Number(clean));
  });
  if (isNumeric) return "number";

  const isDate = nonEmpty.every((v) => {
    const d = Date.parse(v);
    return !isNaN(d) && isNaN(Number(v));
  });
  if (isDate) return "date";

  return "string";
}

export function sortRows(
  rows: string[][],
  colIdx: number,
  direction: Exclude<SortDirection, "none">,
): string[][] {
  // Summary rows are computed, not data — sortRowIndices already pins them
  // after the sorted data rows, so a plain index remap is all that's needed.
  const order = sortRowIndices(rows, (row, i) => row[i] ?? "", colIdx, direction);
  return order.map((i) => rows[i]);
}

export function nextSortDirection(current: SortDirection): SortDirection {
  if (current === "none") return "asc";
  if (current === "asc") return "desc";
  return "none";
}
