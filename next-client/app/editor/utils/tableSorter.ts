import { isFormulaCell } from "./formula-engine";

export type SortDirection = "asc" | "desc" | "none";

export interface SortState {
  colIdx: number;
  direction: Exclude<SortDirection, "none">;
}

export type ColType = "number" | "date" | "string";

// A row containing a formula cell is a computed summary, not data — e.g. the
// `=SUM(...)` row the Table Dialog's Σ button inserts.
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
    // Strip common currency symbols, commas, and spaces
    const clean = v.replace(/[$€£¥,%\s]/g, "");
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

export function sortRows(
  rows: string[][],
  colIdx: number,
  direction: Exclude<SortDirection, "none">,
): string[][] {
  const isEmpty = (v: string) => v.trim() === "";
  // Summary rows (containing a formula) are computed, not data — never sort
  // them, always keep them pinned after the sorted data rows.
  const dataRows = rows.filter((r) => !isSummaryRow(r));
  const summaryRows = rows.filter(isSummaryRow);
  const colType = detectColumnType(dataRows, colIdx);

  const sorted = [...dataRows].sort((a, b) => {
    const av = a[colIdx] ?? "";
    const bv = b[colIdx] ?? "";

    // Empty cells always go to the bottom regardless of direction
    if (isEmpty(av) && isEmpty(bv)) return 0;
    if (isEmpty(av)) return 1;
    if (isEmpty(bv)) return -1;

    let cmp = 0;
    if (colType === "number") {
      const numA = Number(av.replace(/[$€£¥,%\s]/g, ""));
      const numB = Number(bv.replace(/[$€£¥,%\s]/g, ""));
      cmp = numA - numB;
    } else if (colType === "date") {
      cmp = Date.parse(av) - Date.parse(bv);
    } else {
      cmp = av.localeCompare(bv);
    }

    return direction === "asc" ? cmp : -cmp;
  });

  return [...sorted, ...summaryRows];
}

export function nextSortDirection(current: SortDirection): SortDirection {
  if (current === "none") return "asc";
  if (current === "asc") return "desc";
  return "none";
}
