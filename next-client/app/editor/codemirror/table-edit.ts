import { isolateHistory } from "@codemirror/commands";
import { syntaxTree } from "@codemirror/language";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { isFormulaCell } from "../utils/formula-engine";
import { findTableAtPos, isTableLine, TableInfo } from "../utils/table-detection";
import { addRow } from "../utils/table-manipulation";
import { extractTableSource, parseTable, type TableData } from "../utils/tableParser";
import { serializeTable } from "../utils/tableSerializer";
import { focusTableCellOrEditor } from "./table-focus";

// Shared table editing primitives: locating the table at the caret, line and
// cell offset math, realignment, and applying a table rewrite as one CM6
// transaction (a single undo step). Used by the keyboard commands in
// table-commands.ts and the menu actions in table-menu-actions.ts.
// Direct port of use-table-callout.ts's pure line-math helpers — these
// never touched the textarea, so they're unchanged. What changes is how
// edits get applied: CM6 transactions (one atomic undo step) instead of
// execCommand("insertText") on a real textarea.

// Pipe-heavy lines inside these blocks are code/markup, not tables — the
// line-based findTableAtPos can't tell the difference on its own.
const NON_TABLE_BLOCKS = new Set(["FencedCode", "CodeBlock", "HTMLBlock", "CommentBlock"]);

// The cursor-facing entry point for every table command and the toolbar.
// Cheap rejection first (the caret's own line must look like a table row),
// then the syntax tree vetoes code blocks, and only then the full-document
// line scan that builds TableInfo runs.
export function findTableInState(state: EditorState, pos: number): TableInfo | null {
  if (!isTableLine(state.doc.lineAt(pos).text)) return null;
  type Node = ReturnType<typeof syntaxTree>["topNode"];
  for (let node: Node | null = syntaxTree(state).resolve(pos); node; node = node.parent) {
    if (NON_TABLE_BLOCKS.has(node.name)) return null;
  }
  return findTableAtPos(state.doc.toString(), pos);
}

export function tableAtCursor(view: EditorView): TableInfo | null {
  return findTableInState(view.state, view.state.selection.main.head);
}

export function isSeparatorRow(line: string): boolean {
  return /^\s*\|[\s:|-]+\|\s*$/.test(line);
}

export function computeLineOffset(lines: string[], lineIdx: number): number {
  let offset = 0;
  for (let i = 0; i < lineIdx; i++) offset += lines[i].length + 1;
  return offset;
}

// Index of the (n+1)th unescaped pipe — `\|` inside a cell isn't a delimiter.
export function nthPipeIndex(line: string, n: number): number {
  let seen = -1;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === "\\" && line[i + 1] === "|") {
      i++;
      continue;
    }
    if (line[i] === "|" && ++seen === n) return i;
  }
  return -1;
}

function blockLength(lines: string[], start: number, end: number): number {
  let len = 0;
  for (let i = start; i <= end; i++) {
    len += lines[i].length;
    if (i < end) len += 1;
  }
  return len;
}

export function realignTableLines(lines: string[], tableStart: number, tableEnd: number): string[] {
  const source = extractTableSource(lines, tableStart, tableEnd);
  const data = parseTable(source);
  if (!data) return lines;
  const serialized = serializeTable(data, true).split("\n");
  return [...lines.slice(0, tableStart), ...serialized, ...lines.slice(tableEnd + 1)];
}

// Replaces `target`'s table range in the doc with `newLines`, as one CM6
// transaction (a single, atomic undo step — an improvement over the old
// execCommand hack, which needed the caret-restore workaround below it).
// `isolate` keeps structural edits (sort, add/remove/move row or column…)
// from being merged by history with typing right before or after them, so
// one Ctrl/Cmd+Z undoes exactly that one operation.
export function applyTableChangeFor(
  view: EditorView,
  target: TableInfo,
  newLines: string[],
  cursorPos?: number,
  { isolate = false }: { isolate?: boolean } = {},
) {
  const oldTableLineCount = target.tableEnd - target.tableStart + 1;
  const tableEndOffset = target.tableStartOffset + blockLength(target.lines, target.tableStart, target.tableEnd);
  const lineDelta = newLines.length - target.lines.length;
  const newTableLineCount = oldTableLineCount + lineDelta;
  const newTableContent = newLines
    .slice(target.tableStart, target.tableStart + newTableLineCount)
    .join("\n");

  view.dispatch(view.state.update({
    changes: { from: target.tableStartOffset, to: tableEndOffset, insert: newTableContent },
    selection: cursorPos !== undefined ? EditorSelection.cursor(cursorPos) : undefined,
    userEvent: "input.replace.table",
    annotations: isolate ? isolateHistory.of("full") : undefined,
    scrollIntoView: true,
  }));
  // Tables render as an inline editable grid, so "focus" means the cell
  // at the new caret, not the (hidden) source text.
  focusTableCellOrEditor(view, view.state.selection.main.head);
}

export const STRUCTURAL = { isolate: true } as const;

// Caret offset of the start of cell `col` on line `lineIdx` of `lines`.
export function cellCursorPos(lines: string[], lineIdx: number, col: number): number {
  const line = lines[lineIdx] ?? "";
  const pipeIdx = nthPipeIndex(line, col);
  return computeLineOffset(lines, lineIdx) + (pipeIdx === -1 ? 0 : pipeIdx + 2);
}

export function hasSeparator(tableInfo: TableInfo): boolean {
  return tableInfo.tableEnd > tableInfo.tableStart
    && isSeparatorRow(tableInfo.lines[tableInfo.tableStart + 1]);
}

// Appends an empty row after the table's last line and puts the caret in its
// first cell (Enter at the end of a row, Tab in the very last cell).
export function appendRowAndFocus(view: EditorView, tableInfo: TableInfo) {
  // With a totals row at the bottom, new rows go above it and its ranges
  // grow to include them, like adding a row inside a spreadsheet range.
  const data = currentTableData(tableInfo);
  if (data && data.rows.length > 0 && isTotalsRow(data.rows[data.rows.length - 1])) {
    const totals = data.rows[data.rows.length - 1];
    const lastDataRow = data.rows.length; // A1 row of the last data row (header = 1)
    const grown = totals.map((cell) =>
      isFormulaCell(cell)
        ? cell.replace(/\b([A-Z]+)(\d+):([A-Z]+)(\d+)\b/g, (whole, c1: string, r1: string, c2: string, r2: string) =>
            Number(r2) === lastDataRow ? `${c1}${r1}:${c2}${lastDataRow + 1}` : whole)
        : cell,
    );
    const rows = [...data.rows.slice(0, -1), Array(data.headers.length).fill(""), grown];
    const newRowLineIdx = tableInfo.tableStart + 2 + (rows.length - 2);
    applyTableData(view, tableInfo, { ...data, rows }, newRowLineIdx, 0);
    return;
  }
  const linesWithNewRow = addRow(tableInfo.lines, tableInfo.tableEnd);
  const newRowIdx = tableInfo.tableEnd + 1;
  const realigned = realignTableLines(linesWithNewRow, tableInfo.tableStart, tableInfo.tableEnd + 1);
  applyTableChangeFor(view, tableInfo, realigned, cellCursorPos(realigned, newRowIdx, 0));
}

export function moveToCell(view: EditorView, tableInfo: TableInfo, targetRow: number, targetCol: number) {
  const newLines = realignTableLines(tableInfo.lines, tableInfo.tableStart, tableInfo.tableEnd);
  const targetLine = newLines[targetRow];
  const pipeIdx = nthPipeIndex(targetLine, targetCol);
  const cursorPos =
    computeLineOffset(newLines, targetRow) + (pipeIdx === -1 ? Math.max(0, targetLine.length - 1) : pipeIdx + 2);

  if (newLines === tableInfo.lines) {
    view.dispatch({ selection: EditorSelection.cursor(cursorPos) });
    focusTableCellOrEditor(view, cursorPos);
  } else {
    applyTableChangeFor(view, tableInfo, newLines, cursorPos);
  }
}

// Serializes `data` in place of the table and puts the caret at the start
// of cell `targetCol` on `targetLineIdx`, as one isolated undo step.
export function applyTableData(
  view: EditorView,
  tableInfo: TableInfo,
  data: TableData,
  targetLineIdx: number,
  targetCol: number,
) {
  const serialized = serializeTable(data, true).split("\n");
  const newLines = [
    ...tableInfo.lines.slice(0, tableInfo.tableStart),
    ...serialized,
    ...tableInfo.lines.slice(tableInfo.tableEnd + 1),
  ];
  applyTableChangeFor(view, tableInfo, newLines, cellCursorPos(newLines, targetLineIdx, targetCol), STRUCTURAL);
}

export function currentTableData(tableInfo: TableInfo): TableData | null {
  return parseTable(extractTableSource(tableInfo.lines, tableInfo.tableStart, tableInfo.tableEnd));
}

// Per-row formulas such as =B2*C2 don't count, so a data row that computes
// something is never mistaken for the totals row.
const AGGREGATE_FORMULA = /^=\s*(SUM|AVERAGE|COUNTA?|MIN|MAX)\s*\(/i;

export function isTotalsRow(row: string[]): boolean {
  return row.some((cell) => AGGREGATE_FORMULA.test(cell.trim()));
}
