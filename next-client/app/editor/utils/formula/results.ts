import type { TableData } from "../tableParser";
import { isFormulaError, type FormulaValue } from "./values";

// --- Table evaluation ----------------------------------------------------

export interface CurrencyHint {
  symbol: string;
  suffix: boolean;
}

export interface FormulaCellResult {
  raw: string;
  value: FormulaValue;
  display: string;
  currency: CurrencyHint | null;
}

export function formatFormulaValue(v: FormulaValue, currency?: CurrencyHint | null): string {
  if (isFormulaError(v)) return v.code;
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") {
    const rounded = Math.round(v * 100) / 100;
    if (!currency) {
      return String(rounded);
    }
    const formatted = rounded.toLocaleString("en", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return currency.suffix ? `${formatted} ${currency.symbol}` : `${currency.symbol}${formatted}`;
  }
  return v;
}

export function resolveCellText(data: TableData, row: number, col: number): string | null {
  if (col < 0 || col >= data.headers.length) return null;
  if (row === 1) return data.headers[col] ?? "";
  const dataRowIdx = row - 2;
  if (dataRowIdx < 0 || dataRowIdx >= data.rows.length) return null;
  return data.rows[dataRowIdx][col] ?? "";
}

// Evaluates every formula cell in `data`. Returns a map keyed `"{row}_{col}"`
// (row 1 = header) containing only the cells that are formulas — callers use
// this to decide which cells need a computed display instead of raw text.
// Full recompute on every call: table sizes here are small (tens of cells),
// so there's no need for an incremental dependency graph.
//
// `namedTables` maps the markdown heading above each table (case-insensitive)
// to its parsed TableData, enabling cross-table references like `=SUM(Income!B)`
// or `=Expenses!B3`.
//
// `fileTables` maps a normalized note key (see `normalizeNoteKey`) to that
// file's own heading->TableData map, enabling cross-*file* references like
// `=[[Budget Tracker]]!B5` or `=[[Budget Tracker#Income]]!B5`. Cells in the
// referenced file are evaluated using only that file's own `namedTables` —
// nested `[[...]]` refs inside it are not chained (resolve to `#REF!`) to
