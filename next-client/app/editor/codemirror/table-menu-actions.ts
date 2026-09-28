import { isolateHistory } from "@codemirror/commands";
import { ChangeSpec, Transaction } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { colIndexToLetter } from "../utils/formula-engine";
import { findTableAtPos, TableInfo } from "../utils/table-detection";
import { cycleAlignment, getColumnAlignment, insertColumnAt, insertRowAt, moveTableColumn, moveTableRow, removeColumn, removeRow, tableToCSV, tableToJSON } from "../utils/table-manipulation";
import { type Alignment, extractTableSource, parseTable } from "../utils/tableParser";
import { serializeTable } from "../utils/tableSerializer";
import { type SortDirection, sortRows } from "../utils/tableSorter";
import { appendRowAndFocus, applyTableChangeFor, applyTableData, cellCursorPos, currentTableData, isTotalsRow, realignTableLines, STRUCTURAL } from "./table-edit";

// Table menu actions (row/column/table menu from table-handles.ts and the
// cell context menu): insert, move, delete, align, sort, sum, copy, paste.
// --- Menu actions (table grips, see table-handles.ts) ---

export function removeTableAction(view: EditorView, tableInfo: TableInfo) {
  const oldTableLineCount = tableInfo.tableEnd - tableInfo.tableStart + 1;
  let tableEndOffset = tableInfo.tableStartOffset;
  for (let i = 0; i < oldTableLineCount; i++) {
    tableEndOffset += tableInfo.lines[tableInfo.tableStart + i].length;
    if (i < oldTableLineCount - 1) tableEndOffset += 1;
  }
  const fullText = view.state.doc.toString();
  const selectEnd =
    tableEndOffset < fullText.length && fullText[tableEndOffset] === "\n" ? tableEndOffset + 1 : tableEndOffset;

  view.dispatch(view.state.update({
    changes: { from: tableInfo.tableStartOffset, to: selectEnd, insert: "" },
    userEvent: "delete.table",
    annotations: isolateHistory.of("full"),
  }));
  view.focus();
}

export function cycleAlignAction(view: EditorView, tableInfo: TableInfo) {
  const { lines: newLines } = cycleAlignment(tableInfo.lines, tableInfo.cursorCol, tableInfo.tableStart);
  applyTableChangeFor(view, tableInfo, newLines, undefined, STRUCTURAL);
}

export function copyCSVAction(tableInfo: TableInfo) {
  const csv = tableToCSV(tableInfo.lines, tableInfo.tableStart, tableInfo.tableEnd);
  navigator.clipboard.writeText(csv).catch(() => {});
}

export function copyJSONAction(tableInfo: TableInfo) {
  const data = parseTable(extractTableSource(tableInfo.lines, tableInfo.tableStart, tableInfo.tableEnd));
  if (!data) return;
  navigator.clipboard.writeText(tableToJSON(data)).catch(() => {});
}

export function addRowAction(view: EditorView, tableInfo: TableInfo) {
  const insertAfter = tableInfo.lineIdx <= tableInfo.tableStart + 1 ? tableInfo.tableStart + 1 : tableInfo.lineIdx;
  const newLines = insertRowAt(tableInfo.lines, insertAfter);
  const newTableEnd = tableInfo.tableEnd + 1;
  const realigned = realignTableLines(newLines, tableInfo.tableStart, newTableEnd);
  applyTableChangeFor(view, tableInfo, realigned, cellCursorPos(realigned, insertAfter + 1, 0), STRUCTURAL);
}

export function removeRowAction(view: EditorView, tableInfo: TableInfo) {
  const newLines = removeRow(tableInfo.lines, tableInfo.lineIdx, tableInfo.tableStart);
  const newTableEnd = tableInfo.tableEnd - 1;
  const targetLineIdx = Math.min(tableInfo.lineIdx, newTableEnd);
  const realigned = realignTableLines(newLines, tableInfo.tableStart, newTableEnd);
  const cursorPos = realigned[targetLineIdx] !== undefined
    ? cellCursorPos(realigned, targetLineIdx, tableInfo.cursorCol)
    : cellCursorPos(realigned, tableInfo.tableStart, tableInfo.cursorCol);
  applyTableChangeFor(view, tableInfo, realigned, cursorPos, STRUCTURAL);
}

export function addColumnAction(view: EditorView, tableInfo: TableInfo) {
  const newLines = insertColumnAt(tableInfo.lines, tableInfo.cursorCol, tableInfo.tableStart, tableInfo.tableEnd);
  const realigned = realignTableLines(newLines, tableInfo.tableStart, tableInfo.tableEnd);
  const cursorPos = cellCursorPos(realigned, tableInfo.lineIdx, tableInfo.cursorCol + 1);
  applyTableChangeFor(view, tableInfo, realigned, cursorPos, STRUCTURAL);
}

export function removeColumnAction(view: EditorView, tableInfo: TableInfo) {
  const newLines = removeColumn(tableInfo.lines, tableInfo.cursorCol, tableInfo.tableStart, tableInfo.tableEnd);
  const realigned = realignTableLines(newLines, tableInfo.tableStart, tableInfo.tableEnd);
  const cursorPos = cellCursorPos(realigned, tableInfo.lineIdx, Math.max(0, tableInfo.cursorCol - 1));
  applyTableChangeFor(view, tableInfo, realigned, cursorPos, STRUCTURAL);
}

export function sortColumnAction(view: EditorView, tableInfo: TableInfo, direction: Exclude<SortDirection, "none">) {
  const data = currentTableData(tableInfo);
  if (!data) return;
  const sortedRows = sortRows(data.rows, tableInfo.cursorCol, direction);
  applyTableData(view, tableInfo, { ...data, rows: sortedRows }, tableInfo.lineIdx, tableInfo.cursorCol);
}

// Swaps the caret's data row with its neighbour; returns false when there
// is nothing to swap with (header/separator row, first/last data row).
export function moveRowAction(view: EditorView, tableInfo: TableInfo, direction: 1 | -1): boolean {
  const rowIdx = tableInfo.lineIdx - tableInfo.tableStart - 2;
  if (rowIdx < 0) return false;
  const data = currentTableData(tableInfo);
  const moved = data && moveTableRow(data, rowIdx, direction);
  if (!moved) return false;
  applyTableData(view, tableInfo, moved, tableInfo.lineIdx + direction, tableInfo.cursorCol);
  return true;
}

// Swaps the caret's column (with its alignment) with its neighbour.
export function moveColumnAction(view: EditorView, tableInfo: TableInfo, direction: 1 | -1): boolean {
  const data = currentTableData(tableInfo);
  const moved = data && moveTableColumn(data, tableInfo.cursorCol, direction);
  if (!moved) return false;
  applyTableData(view, tableInfo, moved, tableInfo.lineIdx, tableInfo.cursorCol + direction);
  return true;
}

// Inserts an empty row above the caret's data row (the header can't have
// a row above it, so from the header this inserts the first data row).
export function insertRowAboveAction(view: EditorView, tableInfo: TableInfo) {
  const insertAfter = Math.max(tableInfo.tableStart + 1, tableInfo.lineIdx - 1);
  const newLines = insertRowAt(tableInfo.lines, insertAfter);
  const realigned = realignTableLines(newLines, tableInfo.tableStart, tableInfo.tableEnd + 1);
  applyTableChangeFor(view, tableInfo, realigned, cellCursorPos(realigned, insertAfter + 1, tableInfo.cursorCol), STRUCTURAL);
}

export function insertColumnLeftAction(view: EditorView, tableInfo: TableInfo) {
  const newLines = insertColumnAt(tableInfo.lines, tableInfo.cursorCol - 1, tableInfo.tableStart, tableInfo.tableEnd);
  const realigned = realignTableLines(newLines, tableInfo.tableStart, tableInfo.tableEnd);
  applyTableChangeFor(view, tableInfo, realigned, cellCursorPos(realigned, tableInfo.lineIdx, tableInfo.cursorCol), STRUCTURAL);
}

export function setAlignmentAction(view: EditorView, tableInfo: TableInfo, alignment: Alignment) {
  const data = currentTableData(tableInfo);
  if (!data || tableInfo.cursorCol >= data.alignments.length) return;
  const alignments = [...data.alignments];
  alignments[tableInfo.cursorCol] = alignment;
  applyTableData(view, tableInfo, { ...data, alignments }, tableInfo.lineIdx, tableInfo.cursorCol);
}

// A totals row holds at least one aggregate formula (=SUM(B2:B5), =AVERAGE(C)…).

// "Sum column": puts `=SUM(<col>2:<col>N)` over the data rows into a totals
// row at the bottom — reusing the last row when it's already a totals row
// (holds a formula), otherwise appending one.
export function sumColumnAction(view: EditorView, tableInfo: TableInfo) {
  const data = currentTableData(tableInfo);
  if (!data) return;
  const col = tableInfo.cursorCol;
  const letter = colIndexToLetter(col);
  const rows = data.rows.map((row) => [...row]);
  const last = rows[rows.length - 1];
  const hasTotalsRow = !!last && isTotalsRow(last);
  const lastDataRow = hasTotalsRow ? rows.length : rows.length + 1; // A1 rows: header = 1
  const formula = `=SUM(${letter}2:${letter}${Math.max(2, lastDataRow)})`;
  if (hasTotalsRow) {
    last[col] = formula;
  } else {
    const totals = Array(data.headers.length).fill("");
    totals[col] = formula;
    rows.push(totals);
  }
  const totalsLineIdx = tableInfo.tableStart + 1 + rows.length;
  applyTableData(view, tableInfo, { ...data, rows }, totalsLineIdx, col);
}

export function appendRowAction(view: EditorView, tableInfo: TableInfo) {
  appendRowAndFocus(view, tableInfo);
}

// Rewrites the table with outer pipes and padded columns (e.g. a valid
// `A | B` table written without leading/trailing pipes, which the
// line-based table commands can't address). Kept out of history: it
// changes nothing visible in the rendered grid.
export function normalizeTableSource(view: EditorView, from: number, to: number) {
  const source = view.state.sliceDoc(from, to);
  const data = parseTable(source);
  if (!data) return;
  const insert = serializeTable(data, true);
  if (insert === source) return;
  view.dispatch({
    changes: paddingChanges(from, source, insert) ?? { from, to, insert },
    userEvent: "input.replace.table",
    annotations: Transaction.addToHistory.of(false),
  });
}

// Spreadsheet-style multi-cell paste: writes `grid` into the table starting
// at the caret's cell, growing rows/columns as needed. Pipes in pasted
// values are escaped so they can't split cells.
export function pasteGridAction(view: EditorView, tableInfo: TableInfo, grid: string[][]): boolean {
  const data = currentTableData(tableInfo);
  if (!data || grid.length === 0) return false;
  const lineOffset = tableInfo.lineIdx - tableInfo.tableStart;
  if (lineOffset === 1) return false; // separator row
  const startRow = lineOffset === 0 ? -1 : lineOffset - 2; // -1 = header
  const startCol = tableInfo.cursorCol;
  const widest = Math.max(...grid.map((row) => row.length));
  const colCount = Math.max(data.headers.length, startCol + widest);

  const pad = (cells: string[]) => [...cells, ...Array(Math.max(0, colCount - cells.length)).fill("")];
  const headers = pad(data.headers);
  const alignments = [...data.alignments];
  while (alignments.length < colCount) alignments.push("left");
  const rows = data.rows.map(pad);

  grid.forEach((values, r) => {
    const target = startRow + r;
    while (target >= rows.length) rows.push(Array(colCount).fill(""));
    const row = target === -1 ? headers : rows[target];
    values.forEach((value, c) => {
      row[startCol + c] = value.trim().replace(/\s*\n\s*/g, " ").replace(/(?<!\\)\|/g, "\\|");
    });
  });

  applyTableData(view, tableInfo, { headers, alignments, rows }, tableInfo.lineIdx, startCol);
  return true;
}

export function getCurrentAlignment(tableInfo: TableInfo) {
  return getColumnAlignment(tableInfo.lines, tableInfo.cursorCol, tableInfo.tableStart);
}

// Diffs two versions of a table that differ only in padding (spaces,
// dashes, colons, added outer pipes) into small changes. Keeping edits that
// small matters for history: changes kept out of undo history are *mapped*
// through by earlier undo events, and a whole-table replacement would wipe
// out every earlier cell edit's position — undo would silently skip them.
// Returns null when the texts differ in anything but padding.
function paddingChanges(from: number, before: string, after: string): ChangeSpec[] | null {
  const changes: { from: number; to: number; insert: string }[] = [];
  const deletable = /[ \t:-]/;
  const insertable = /[ \t:|-]/;
  let i = 0;
  let j = 0;
  while (i < before.length || j < after.length) {
    if (i < before.length && j < after.length && before[i] === after[j]) {
      i++;
      j++;
    } else if (i < before.length && deletable.test(before[i])) {
      const last = changes[changes.length - 1];
      if (last && last.to === from + i) last.to++;
      else changes.push({ from: from + i, to: from + i + 1, insert: "" });
      i++;
    } else if (j < after.length && insertable.test(after[j])) {
      const last = changes[changes.length - 1];
      if (last && last.to === from + i) last.insert += after[j];
      else changes.push({ from: from + i, to: from + i, insert: after[j] });
      j++;
    } else {
      return null;
    }
  }
  return changes;
}

// Rewrites the table starting at `startOffset` with realigned padding (and
// outer pipes), kept out of undo history since nothing visible changes.
function realignTableAt(view: EditorView, startOffset: number) {
  const current = findTableAtPos(view.state.doc.toString(), startOffset);
  if (!current || current.tableStartOffset !== startOffset) return;
  const before = current.lines.slice(current.tableStart, current.tableEnd + 1).join("\n");
  const data = parseTable(before);
  if (!data) return;
  const after = serializeTable(data, true);
  if (after === before) return;
  const changes = paddingChanges(startOffset, before, after)
    ?? [{ from: startOffset, to: startOffset + before.length, insert: after }];
  view.dispatch({
    changes,
    userEvent: "input.replace.table",
    annotations: Transaction.addToHistory.of(false),
  });
}

// Realigns a table's column widths after the caret leaves it. Re-reads the
// table from the current document (the snapshot in `exited` can be stale —
// e.g. a row was added since) and skips it if it's no longer there.
export function realignExitedTable(view: EditorView, exited: TableInfo) {
  realignTableAt(view, exited.tableStartOffset);
}
