import { EditorSelection } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import type { CellOffset } from "../utils/table-cell-offsets";

// Shared between the inline table widget (table-display.tsx) and the table
// commands (table-commands.ts) without a circular import: the widget
// registers each rendered table here, and commands use it to put keyboard
// focus back into the right cell after they rewrite a table.

export interface TableWidgetHandle {
  from: number;
  to: number;
  source: string;
  cells: CellOffset[];
}

const handles = new WeakMap<HTMLElement, TableWidgetHandle>();

export const TABLE_WIDGET_CLASS = "cm-table-editor";
export const CELL_ATTR = "data-source-cell";

export function setTableHandle(dom: HTMLElement, handle: TableWidgetHandle) {
  handles.set(dom, handle);
}

export function getTableHandle(dom: HTMLElement): TableWidgetHandle | undefined {
  return handles.get(dom);
}

export function cellKey(cell: Pick<CellOffset, "row" | "col">) {
  return `${cell.row}:${cell.col}`;
}

export function placeCaret(el: HTMLElement, where: "start" | "end") {
  const selection = el.ownerDocument.getSelection();
  if (!selection) return;
  const range = el.ownerDocument.createRange();
  range.selectNodeContents(el);
  range.collapse(where === "start");
  selection.removeAllRanges();
  selection.addRange(range);
}

function widgetAt(view: EditorView, pos: number): { dom: HTMLElement; handle: TableWidgetHandle } | null {
  for (const dom of view.dom.querySelectorAll<HTMLElement>(`.${TABLE_WIDGET_CLASS}`)) {
    const handle = handles.get(dom);
    if (handle && pos >= handle.from && pos <= handle.to) return { dom, handle };
  }
  return null;
}

// The cell whose pipe-to-pipe segment contains `pos`, else the last cell
// starting before it (e.g. a caret on the separator row), else the first.
function cellForPos(cells: CellOffset[], pos: number): CellOffset | undefined {
  const inside = cells.find((cell) => pos >= cell.fullStart && pos <= cell.fullEnd);
  if (inside) return inside;
  let best: CellOffset | undefined;
  for (const cell of cells) if (cell.start <= pos) best = cell;
  return best ?? cells[0];
}

export function focusCellElement(el: HTMLElement, where: "start" | "end" = "end") {
  el.focus({ preventScroll: false });
  placeCaret(el, where);
}

// Focuses the rendered cell that holds document position `pos`. Returns
// false when no rendered table covers `pos` (caller should fall back to
// focusing the editor).
export function focusTableCellAt(view: EditorView, pos: number, where: "start" | "end" = "end"): boolean {
  const found = widgetAt(view, pos);
  if (!found) return false;
  const cell = cellForPos(found.handle.cells, pos);
  if (!cell) return false;
  const el = found.dom.querySelector<HTMLElement>(`[${CELL_ATTR}="${cellKey(cell)}"]`);
  if (!el) return false;
  focusCellElement(el, where);
  return true;
}

export function focusTableCellOrEditor(view: EditorView, pos: number) {
  if (!focusTableCellAt(view, pos)) view.focus();
}

// Shift+Enter in a cell: done with the table, on with the text. The caret
// goes to an empty line below the table with a blank line on each side of
// it, adding only the lines that are missing, so what is typed next is a
// paragraph of its own: a line directly under a table is read as another
// row, and one directly above text joins that text. One undo step.
export function continueBelowTable(view: EditorView, handle: Pick<TableWidgetHandle, "to">) {
  const { doc } = view.state;
  const blank = (n: number) => n <= doc.lines && doc.line(n).text.trim() === "";
  const last = doc.lineAt(handle.to).number;
  let at: number;
  let insert: string;
  let caret: number;
  if (last === doc.lines) {
    // The table ends the note.
    [at, insert, caret] = [handle.to, "\n\n", handle.to + 2];
  } else if (!blank(last + 1)) {
    [at, insert, caret] = [handle.to, "\n\n\n", handle.to + 2];
  } else {
    const gap = doc.line(last + 1);
    if (last + 1 === doc.lines) [at, insert, caret] = [gap.to, "\n", gap.to + 1];
    else if (!blank(last + 2)) [at, insert, caret] = [gap.to, "\n\n", gap.to + 1];
    else {
      // Two blank lines already: use the second, with a blank under it.
      const line = doc.line(last + 2);
      [at, insert, caret] = [line.to, last + 2 === doc.lines || blank(last + 3) ? "" : "\n", line.from];
    }
  }
  view.dispatch({
    changes: insert ? { from: at, insert } : undefined,
    selection: EditorSelection.cursor(caret),
    scrollIntoView: true,
    userEvent: "input",
  });
  view.focus();
}

// Leaves a table from the keyboard: puts the CM caret on the line just
// above/below it, creating an empty line when the table touches the start
// or end of the document so there's always somewhere to land. At the end of
// the note that is a blank line and then the caret's line, so text typed
// there doesn't become another row.
export function exitTable(view: EditorView, handle: Pick<TableWidgetHandle, "from" | "to">, side: "before" | "after") {
  const { doc } = view.state;
  if (side === "after") {
    if (handle.to < doc.length) {
      view.dispatch({ selection: EditorSelection.cursor(handle.to + 1), scrollIntoView: true });
    } else {
      view.dispatch({
        changes: { from: doc.length, insert: "\n\n" },
        selection: EditorSelection.cursor(doc.length + 2),
        scrollIntoView: true,
      });
    }
  } else if (handle.from > 0) {
    view.dispatch({ selection: EditorSelection.cursor(handle.from - 1), scrollIntoView: true });
  } else {
    view.dispatch({
      changes: { from: 0, insert: "\n" },
      selection: EditorSelection.cursor(0),
      scrollIntoView: true,
    });
  }
  view.focus();
}
