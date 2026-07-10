import { EditorView } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import { findTableAtPos, TableInfo } from "../utils/table-detection";
import {
  addRow,
  insertRowAt,
  insertColumnAt,
  removeRow,
  removeColumn,
  cycleAlignment,
  getColumnAlignment,
  tableToCSV,
} from "../utils/table-manipulation";
import { parseTable, extractTableSource } from "../utils/tableParser";
import { serializeTable } from "../utils/tableSerializer";
import { sortRows, type SortDirection } from "../utils/tableSorter";

// Direct port of use-table-callout.ts's pure line-math helpers — these
// never touched the textarea, so they're unchanged. What changes is how
// edits get applied: CM6 transactions (one atomic undo step) instead of
// execCommand("insertText") on a real textarea.

export function isSeparatorRow(line: string): boolean {
  return /^\s*\|[\s:|-]+\|\s*$/.test(line);
}

export function computeLineOffset(lines: string[], lineIdx: number): number {
  let offset = 0;
  for (let i = 0; i < lineIdx; i++) offset += lines[i].length + 1;
  return offset;
}

function nthPipeIndex(line: string, n: number): number {
  let idx = -1;
  for (let i = 0; i <= n; i++) {
    idx = line.indexOf("|", idx + 1);
    if (idx === -1) return -1;
  }
  return idx;
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
export function applyTableChangeFor(view: EditorView, target: TableInfo, newLines: string[], cursorPos?: number) {
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
    scrollIntoView: true,
  }));
  view.focus();
}

export function moveToCell(view: EditorView, tableInfo: TableInfo, targetRow: number, targetCol: number) {
  const newLines = realignTableLines(tableInfo.lines, tableInfo.tableStart, tableInfo.tableEnd);
  const targetLine = newLines[targetRow];
  const pipeIdx = nthPipeIndex(targetLine, targetCol);
  const cursorPos =
    computeLineOffset(newLines, targetRow) + (pipeIdx === -1 ? Math.max(0, targetLine.length - 1) : pipeIdx + 2);

  if (newLines === tableInfo.lines) {
    view.dispatch({ selection: EditorSelection.cursor(cursorPos) });
    view.focus();
  } else {
    applyTableChangeFor(view, tableInfo, newLines, cursorPos);
  }
}

// Tab / Shift+Tab: jump between table cells, realigning as it goes. CM6's
// keymap treats "Tab" and "Shift-Tab" as distinct bindings, so these are
// two commands rather than one branching on event.shiftKey.
export function tableTabCommand(view: EditorView): boolean {
  const pos = view.state.selection.main.head;
  const tableInfo = findTableAtPos(view.state.doc.toString(), pos);
  if (!tableInfo) return false;

  let targetRow = -1;
  let targetCol = -1;

  const pipeCount = (tableInfo.lines[tableInfo.lineIdx].match(/\|/g) || []).length;
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

  if (targetRow === -1) return false;
  moveToCell(view, tableInfo, targetRow, targetCol);
  return true;
}

export function tableShiftTabCommand(view: EditorView): boolean {
  const pos = view.state.selection.main.head;
  const tableInfo = findTableAtPos(view.state.doc.toString(), pos);
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
      const pipeCount = (tableInfo.lines[prevRow].match(/\|/g) || []).length;
      targetCol = Math.max(0, pipeCount - 2);
    }
  }

  if (targetRow === -1) return false;
  moveToCell(view, tableInfo, targetRow, targetCol);
  return true;
}

export function tablePipeEscapeCommand(view: EditorView): boolean {
  const pos = view.state.selection.main.head;
  const tableInfo = findTableAtPos(view.state.doc.toString(), pos);
  if (!tableInfo) return false;
  view.dispatch(view.state.update({
    changes: { from: pos, to: pos, insert: "\\|" },
    userEvent: "input.type",
  }));
  return true;
}

export function tableEnterCommand(view: EditorView): boolean {
  const pos = view.state.selection.main.head;
  const tableInfo = findTableAtPos(view.state.doc.toString(), pos);
  if (!tableInfo) return false;

  const line = tableInfo.lines[tableInfo.lineIdx];
  const lineStart = computeLineOffset(tableInfo.lines, tableInfo.lineIdx);
  const posInLine = pos - lineStart;

  if (posInLine < line.trimEnd().length - 1) return false;
  if (isSeparatorRow(line)) return false;

  const linesWithNewRow = addRow(tableInfo.lines, tableInfo.tableEnd);
  const newRowIdx = tableInfo.tableEnd + 1;
  const realigned = realignTableLines(linesWithNewRow, tableInfo.tableStart, tableInfo.tableEnd + 1);
  const targetLine = realigned[newRowIdx];
  const pipeIdx = nthPipeIndex(targetLine, 0);
  const cursorPos = computeLineOffset(realigned, newRowIdx) + (pipeIdx === -1 ? 0 : pipeIdx + 2);
  applyTableChangeFor(view, tableInfo, realigned, cursorPos);
  return true;
}

export function tableArrowVerticalCommand(view: EditorView, direction: 1 | -1): boolean {
  const sel = view.state.selection.main;
  if (!sel.empty) return false;
  const pos = sel.head;
  const tableInfo = findTableAtPos(view.state.doc.toString(), pos);
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

// --- Toolbar actions (TableCallout) ---

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
  }));
  view.focus();
}

export function cycleAlignAction(view: EditorView, tableInfo: TableInfo) {
  const { lines: newLines } = cycleAlignment(tableInfo.lines, tableInfo.cursorCol, tableInfo.tableStart);
  applyTableChangeFor(view, tableInfo, newLines);
}

export function copyCSVAction(tableInfo: TableInfo) {
  const csv = tableToCSV(tableInfo.lines, tableInfo.tableStart, tableInfo.tableEnd);
  navigator.clipboard.writeText(csv).catch(() => {});
}

export function addRowAction(view: EditorView, tableInfo: TableInfo) {
  const insertAfter = tableInfo.lineIdx <= tableInfo.tableStart + 1 ? tableInfo.tableStart + 1 : tableInfo.lineIdx;
  const newLines = insertRowAt(tableInfo.lines, insertAfter);
  const newTableEnd = tableInfo.tableEnd + 1;
  const realigned = realignTableLines(newLines, tableInfo.tableStart, newTableEnd);
  const newRowIdx = insertAfter + 1;
  const targetLine = realigned[newRowIdx];
  const pipeIdx = nthPipeIndex(targetLine, 0);
  const cursorPos = computeLineOffset(realigned, newRowIdx) + (pipeIdx === -1 ? 0 : pipeIdx + 2);
  applyTableChangeFor(view, tableInfo, realigned, cursorPos);
}

export function removeRowAction(view: EditorView, tableInfo: TableInfo) {
  const newLines = removeRow(tableInfo.lines, tableInfo.lineIdx, tableInfo.tableStart);
  const newTableEnd = tableInfo.tableEnd - 1;
  const targetLineIdx = Math.min(tableInfo.lineIdx, newTableEnd);
  const realigned = realignTableLines(newLines, tableInfo.tableStart, newTableEnd);
  const targetLine = realigned[targetLineIdx] ?? realigned[tableInfo.tableStart];
  const pipeIdx = nthPipeIndex(targetLine, tableInfo.cursorCol);
  const cursorPos = computeLineOffset(realigned, targetLineIdx) + (pipeIdx === -1 ? 0 : pipeIdx + 2);
  applyTableChangeFor(view, tableInfo, realigned, cursorPos);
}

export function addColumnAction(view: EditorView, tableInfo: TableInfo) {
  const newLines = insertColumnAt(tableInfo.lines, tableInfo.cursorCol, tableInfo.tableStart, tableInfo.tableEnd);
  const realigned = realignTableLines(newLines, tableInfo.tableStart, tableInfo.tableEnd);
  const newCol = tableInfo.cursorCol + 1;
  const targetLine = realigned[tableInfo.lineIdx];
  const pipeIdx = nthPipeIndex(targetLine, newCol);
  const cursorPos = computeLineOffset(realigned, tableInfo.lineIdx) + (pipeIdx === -1 ? 0 : pipeIdx + 2);
  applyTableChangeFor(view, tableInfo, realigned, cursorPos);
}

export function removeColumnAction(view: EditorView, tableInfo: TableInfo) {
  const newLines = removeColumn(tableInfo.lines, tableInfo.cursorCol, tableInfo.tableStart, tableInfo.tableEnd);
  const realigned = realignTableLines(newLines, tableInfo.tableStart, tableInfo.tableEnd);
  const newCol = Math.max(0, tableInfo.cursorCol - 1);
  const targetLine = realigned[tableInfo.lineIdx];
  const pipeIdx = nthPipeIndex(targetLine, newCol);
  const cursorPos = computeLineOffset(realigned, tableInfo.lineIdx) + (pipeIdx === -1 ? 0 : pipeIdx + 2);
  applyTableChangeFor(view, tableInfo, realigned, cursorPos);
}

export function sortColumnAction(view: EditorView, tableInfo: TableInfo, direction: Exclude<SortDirection, "none">) {
  const source = extractTableSource(tableInfo.lines, tableInfo.tableStart, tableInfo.tableEnd);
  const data = parseTable(source);
  if (!data) return;
  const sortedRows = sortRows(data.rows, tableInfo.cursorCol, direction);
  const serialized = serializeTable({ ...data, rows: sortedRows }, true).split("\n");
  const newLines = [
    ...tableInfo.lines.slice(0, tableInfo.tableStart),
    ...serialized,
    ...tableInfo.lines.slice(tableInfo.tableEnd + 1),
  ];
  const targetLine = newLines[tableInfo.lineIdx];
  const pipeIdx = nthPipeIndex(targetLine, tableInfo.cursorCol);
  const cursorPos = computeLineOffset(newLines, tableInfo.lineIdx) + (pipeIdx === -1 ? 0 : pipeIdx + 2);
  applyTableChangeFor(view, tableInfo, newLines, cursorPos);
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
  }));
}
