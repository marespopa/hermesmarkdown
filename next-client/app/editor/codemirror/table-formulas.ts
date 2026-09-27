import { EditorState, StateEffect, StateField } from "@codemirror/state";
import type { TableData } from "../utils/tableParser";
import { evaluateTable, FormulaError, isFormulaCell } from "../utils/formula-engine";

// Spreadsheet formulas in table cells (`=SUM(B2:B4)`, `=Income!B3`,
// `=[[Budget]]!B5`, …), evaluated by utils/formula-engine.ts. The inline
// table grid shows each formula cell's computed result and switches to the
// raw formula only while that cell is focused.

export type FileTables = Map<string, Map<string, TableData>>;

// Tables from other notes referenced as `[[Note]]!A1`. They're read
// asynchronously on the React side (hooks/use-cross-file-tables.ts) and
// pushed in with this effect.
export const setFormulaFileTables = StateEffect.define<FileTables>();

export const formulaFileTablesField = StateField.define<FileTables>({
  create: () => new Map(),
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setFormulaFileTables)) return effect.value;
    }
    return value;
  },
});

export interface ComputedCell {
  display: string;
  isError: boolean;
}

// The nearest Markdown heading above a table (skipping blank lines, at most
// 10 lines up), which names it for cross-table refs like `=SUM(Income!B)`.
// Mirrors findHeadingAbove in utils/table-detection.ts.
export function tableHeadingAbove(state: EditorState, from: number): string | null {
  const first = state.doc.lineAt(from).number;
  for (let n = first - 1; n >= Math.max(1, first - 10); n--) {
    const text = state.doc.line(n).text.trim();
    if (text === "") continue;
    const match = /^#{1,6}\s+(.+)$/.exec(text);
    return match ? match[1].trim() : null;
  }
  return null;
}

// Evaluates every table in one pass so cross-table references resolve.
// `tables[i].data` objects must be the same instances used as values in the
// heading map (the engine skips self-references by identity). Returns, per
// table, the computed display of each formula cell keyed "row:col" (A1 row
// numbering: 1 = header).
export function computeTableFormulas(
  state: EditorState,
  tables: { from: number; data: TableData }[],
): Map<string, ComputedCell>[] {
  const anyFormula = tables.some(({ data }) =>
    data.headers.some(isFormulaCell) || data.rows.some((row) => row.some(isFormulaCell)),
  );
  if (!anyFormula) return tables.map(() => new Map());

  const namedTables = new Map<string, TableData>();
  for (const table of tables) {
    const heading = tableHeadingAbove(state, table.from);
    if (heading && !namedTables.has(heading)) namedTables.set(heading, table.data);
  }
  const fileTables = state.field(formulaFileTablesField, false) ?? new Map();

  return tables.map(({ data }) => {
    const computed = new Map<string, ComputedCell>();
    for (const [key, result] of evaluateTable(data, namedTables, fileTables)) {
      const [row, col] = key.split("_");
      computed.set(`${row}:${col}`, {
        display: result.display,
        isError: result.value instanceof FormulaError,
      });
    }
    return computed;
  });
}
