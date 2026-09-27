import { EditorView } from "@codemirror/view";
import { EditorSelection, EditorState, Transaction } from "@codemirror/state";
import { isolateHistory } from "@codemirror/commands";
import { syntaxTree } from "@codemirror/language";
import { focusTableCellOrEditor } from "./table-focus";
import { findTableAtPos, isTableLine, TableInfo } from "../utils/table-detection";
import {
  addRow,
  insertRowAt,
  moveTableRow,
  moveTableColumn,
  tableToJSON,
  insertColumnAt,
  removeRow,
  removeColumn,
  cycleAlignment,
  getColumnAlignment,
  tableToCSV,
} from "../utils/table-manipulation";
import { parseTable, extractTableSource, type Alignment, type TableData } from "../utils/tableParser";
import { serializeTable } from "../utils/tableSerializer";
import { sortRows, type SortDirection } from "../utils/tableSorter";

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

function tableAtCursor(view: EditorView): TableInfo | null {
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
function nthPipeIndex(line: string, n: number): number {
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

const STRUCTURAL = { isolate: true } as const;

// Caret offset of the start of cell `col` on line `lineIdx` of `lines`.
function cellCursorPos(lines: string[], lineIdx: number, col: number): number {
  const line = lines[lineIdx] ?? "";
  const pipeIdx = nthPipeIndex(line, col);
  return computeLineOffset(lines, lineIdx) + (pipeIdx === -1 ? 0 : pipeIdx + 2);
}

function hasSeparator(tableInfo: TableInfo): boolean {
  return tableInfo.tableEnd > tableInfo.tableStart
    && isSeparatorRow(tableInfo.lines[tableInfo.tableStart + 1]);
}

// Appends an empty row after the table's last line and puts the caret in its
// first cell (Enter at the end of a row, Tab in the very last cell).
function appendRowAndFocus(view: EditorView, tableInfo: TableInfo) {
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

// Tab / Shift+Tab: jump between table cells, realigning as it goes. CM6's
// keymap treats "Tab" and "Shift-Tab" as distinct bindings, so these are
// two commands rather than one branching on event.shiftKey.
export function tableTabCommand(view: EditorView): boolean {
  const tableInfo = tableAtCursor(view);
  if (!tableInfo) return false;

  let targetRow = -1;
  let targetCol = -1;

  const pipeCount = (tableInfo.lines[tableInfo.lineIdx].replace(/\\\|/g, "").match(/\|/g) || []).length;
  const lastCol = Math.max(0, pipeCount - 2);
  if (tableInfo.cursorCol < lastCol) {
    targetRow = tableInfo.lineIdx;
    targetCol = tableInfo.cursorCol + 1;
  } else {
    let nextRow = tableInfo.lineIdx + 1;
    while (nextRow <= tableInfo.tableEnd && isSeparatorRow(tableInfo.lines[nextRow])) nextRow++;
    if (nextRow <= tableInfo.tableEnd) {
      targetRow = nextRow;
      targetCol = 0;
    }
  }

  if (targetRow === -1) {
    // Tab in the very last cell grows the table, spreadsheet-style. A table
    // still being drafted (no separator row yet) falls through instead.
    if (!hasSeparator(tableInfo)) return false;
    appendRowAndFocus(view, tableInfo);
    return true;
  }
  moveToCell(view, tableInfo, targetRow, targetCol);
  return true;
}

export function tableShiftTabCommand(view: EditorView): boolean {
  const tableInfo = tableAtCursor(view);
  if (!tableInfo) return false;

  let targetRow = -1;
  let targetCol = -1;

  if (tableInfo.cursorCol > 0) {
    targetRow = tableInfo.lineIdx;
    targetCol = tableInfo.cursorCol - 1;
  } else {
    let prevRow = tableInfo.lineIdx - 1;
    while (prevRow >= tableInfo.tableStart && isSeparatorRow(tableInfo.lines[prevRow])) prevRow--;
    if (prevRow >= tableInfo.tableStart) {
      targetRow = prevRow;
      const pipeCount = (tableInfo.lines[prevRow].replace(/\\\|/g, "").match(/\|/g) || []).length;
      targetCol = Math.max(0, pipeCount - 2);
    }
  }

  if (targetRow === -1) return false;
  moveToCell(view, tableInfo, targetRow, targetCol);
  return true;
}

// Typing "|" inside a cell's text escapes it so it can't split the cell.
// It stays a plain pipe while the table is still being drafted (no
// separator row yet), on the separator row, and when appending at the end
// of a row — so a new column can still be typed by hand.
export function tablePipeEscapeCommand(view: EditorView): boolean {
  const pos = view.state.selection.main.head;
  const tableInfo = tableAtCursor(view);
  if (!tableInfo || !hasSeparator(tableInfo)) return false;

  const line = view.state.doc.lineAt(pos);
  if (isSeparatorRow(line.text)) return false;
  if (pos - line.from >= line.text.trimEnd().length) return false;

  view.dispatch(view.state.update({
    changes: { from: pos, to: pos, insert: "\\|" },
    selection: EditorSelection.cursor(pos + 2),
    userEvent: "input.type",
  }));
  return true;
}

export function tableEnterCommand(view: EditorView): boolean {
  const pos = view.state.selection.main.head;
  const tableInfo = tableAtCursor(view);
  if (!tableInfo) return false;

  const line = tableInfo.lines[tableInfo.lineIdx];
  const lineStart = computeLineOffset(tableInfo.lines, tableInfo.lineIdx);
  const posInLine = pos - lineStart;

  if (posInLine < line.trimEnd().length - 1) return false;
  if (isSeparatorRow(line)) return false;

  appendRowAndFocus(view, tableInfo);
  return true;
}

export function tableArrowVerticalCommand(view: EditorView, direction: 1 | -1): boolean {
  const sel = view.state.selection.main;
  if (!sel.empty) return false;
  const tableInfo = tableAtCursor(view);
  if (!tableInfo) return false;

  let targetRow = tableInfo.lineIdx + direction;
  if (
    targetRow >= tableInfo.tableStart &&
    targetRow <= tableInfo.tableEnd &&
    isSeparatorRow(tableInfo.lines[targetRow])
  ) {
    targetRow += direction;
  }
  if (targetRow < tableInfo.tableStart || targetRow > tableInfo.tableEnd) return false;

  const line = tableInfo.lines[targetRow];
  let pipeIdx = nthPipeIndex(line, tableInfo.cursorCol);
  if (pipeIdx === -1) pipeIdx = line.lastIndexOf("|", Math.max(0, line.length - 2));
  if (pipeIdx === -1) return false;

  const newPos = computeLineOffset(tableInfo.lines, targetRow) + pipeIdx + 2;
  view.dispatch({ selection: EditorSelection.cursor(newPos) });
  return true;
}

// Alt+↑/↓ (rows) and Mod+Alt+←/→ (columns). Inside a table these always
// consume the key, even when the move isn't possible (header row, edge
// column) — otherwise Alt+↑/↓ would fall through to moveLineUp/Down and
// tear a row out of the table.
export function tableMoveRowCommand(view: EditorView, direction: 1 | -1): boolean {
  const tableInfo = tableAtCursor(view);
  if (!tableInfo) return false;
  moveRowAction(view, tableInfo, direction);
  return true;
}

export function tableMoveColumnCommand(view: EditorView, direction: 1 | -1): boolean {
  const tableInfo = tableAtCursor(view);
  if (!tableInfo) return false;
  moveColumnAction(view, tableInfo, direction);
  return true;
}

// Mod+Enter: insert a row below the caret's row (overrides task-status
// cycling only inside a finished table).
export function tableInsertRowCommand(view: EditorView): boolean {
  const tableInfo = tableAtCursor(view);
  if (!tableInfo || !hasSeparator(tableInfo)) return false;
  addRowAction(view, tableInfo);
  return true;
}

// Mod+Shift+Backspace: delete the caret's data row (never the header or
// separator).
export function tableDeleteRowCommand(view: EditorView): boolean {
  const tableInfo = tableAtCursor(view);
  if (!tableInfo || tableInfo.lineIdx <= tableInfo.tableStart + 1) return false;
  removeRowAction(view, tableInfo);
  return true;
}

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

// Serializes `data` in place of the table and puts the caret at the start
// of cell `targetCol` on `targetLineIdx`, as one isolated undo step.
function applyTableData(
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

function currentTableData(tableInfo: TableInfo): TableData | null {
  return parseTable(extractTableSource(tableInfo.lines, tableInfo.tableStart, tableInfo.tableEnd));
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
    changes: { from, to, insert },
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

// Realigns a table's column widths after the caret leaves it, shifting
// caretPos by whatever length delta the realign introduces so the caret
// stays put relative to surrounding text (not inside the table).
export function realignExitedTable(view: EditorView, exited: TableInfo, caretPos: number) {
  const newLines = realignTableLines(exited.lines, exited.tableStart, exited.tableEnd);
  const oldContent = exited.lines.slice(exited.tableStart, exited.tableEnd + 1).join("\n");
  const newContent = newLines.slice(exited.tableStart, exited.tableEnd + 1).join("\n");
  if (newContent === oldContent) return;

  const delta = newContent.length - oldContent.length;
  const tableEndOffset = exited.tableStartOffset + oldContent.length;
  const adjustedCaretPos = caretPos >= tableEndOffset ? caretPos + delta : caretPos;

  view.dispatch(view.state.update({
    changes: { from: exited.tableStartOffset, to: tableEndOffset, insert: newContent },
    selection: EditorSelection.cursor(Math.max(0, Math.min(adjustedCaretPos, view.state.doc.length))),
    userEvent: "input.replace.table",
    // Padding-only change with no visible effect in the rendered grid —
    // keep it out of history so Ctrl/Cmd+Z never "does nothing".
    annotations: Transaction.addToHistory.of(false),
  }));
}
