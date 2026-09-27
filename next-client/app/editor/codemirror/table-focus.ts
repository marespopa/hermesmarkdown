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

// Leaves a table from the keyboard: puts the CM caret on the line just
// above/below it, creating an empty line when the table touches the start
// or end of the document so there's always somewhere to land.
export function exitTable(view: EditorView, handle: Pick<TableWidgetHandle, "from" | "to">, side: "before" | "after") {
  const { doc } = view.state;
  if (side === "after") {
    if (handle.to < doc.length) {
      view.dispatch({ selection: EditorSelection.cursor(handle.to + 1), scrollIntoView: true });
    } else {
      view.dispatch({
        changes: { from: doc.length, insert: "\n" },
        selection: EditorSelection.cursor(doc.length + 1),
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
