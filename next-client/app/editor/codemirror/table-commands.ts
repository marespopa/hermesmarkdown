import { EditorSelection } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { appendRowAndFocus, computeLineOffset, hasSeparator, isSeparatorRow, moveToCell, nthPipeIndex, tableAtCursor } from "./table-edit";
import { addRowAction, moveColumnAction, moveRowAction, removeRowAction } from "./table-menu-actions";

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

// Public surface: the keyboard commands above plus the shared primitives
// and menu actions, so callers keep importing from "./table-commands".
export * from "./table-edit";
export * from "./table-menu-actions";
