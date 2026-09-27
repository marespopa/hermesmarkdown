import { syntaxTree } from "@codemirror/language";
import { EditorState, Extension, Prec, Range, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, keymap, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { type CellOffset, getTableCellOffsetsFromSource } from "../utils/table-cell-offsets";
import { type Alignment, parseTable, type TableData } from "../utils/tableParser";
import { buildTable, handleFor, matchByWrapper, refreshHandles, shapeOf, syncTable } from "./table-cell-dom";
import { attachCellHandlers, refocusLater } from "./table-cell-handlers";
import { CELL_ATTR, focusCellElement, focusTableCellAt, getTableHandle, setTableHandle, TABLE_WIDGET_CLASS } from "./table-focus";
import { type ComputedCell, computeTableFormulas, formulaFileTablesField, setFormulaFileTables } from "./table-formulas";

// Tables are always shown as a rendered grid whose cells are edited in
// place — the pipe syntax is never visible. The document stays the single
// source of truth: every keystroke in a cell is written straight back as a
// minimal change to that cell's source range, so undo/redo, autosave,
// split panes and merges all see the table exactly as displayed.

export interface TableDisplayMatch {
  from: number;
  to: number;
  source: string;
  cells: CellOffset[];
  alignments: Alignment[];
  // Computed results of formula cells (`=SUM(B2:B4)`), keyed "row:col".
  computed: Map<string, ComputedCell>;
  // Changes whenever any computed result changes, so a table re-renders
  // when a formula's inputs live in a different table or note.
  computedSignature: string;
}

export function collectTableDisplayMatches(state: EditorState): TableDisplayMatch[] {
  const found: { from: number; to: number; source: string; data: TableData }[] = [];

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name !== "Table") return;
      const source = state.doc.sliceString(node.from, node.to);
      const data = parseTable(source);
      if (!data) return;
      found.push({ from: node.from, to: node.to, source, data });
    },
  });

  const computed = computeTableFormulas(state, found);
  return found.map((table, i) => ({
    from: table.from,
    to: table.to,
    source: table.source,
    cells: getTableCellOffsetsFromSource(table.source, table.from),
    alignments: table.data.alignments,
    computed: computed[i],
    computedSignature: [...computed[i]].map(([key, cell]) => `${key}=${cell.display}`).join("\u0001"),
  }));
}

// Escaped pipes are a storage detail: cells show and edit a plain "|".

class TableEditorWidget extends WidgetType {
  constructor(private readonly match: TableDisplayMatch) {
    super();
  }

  eq(other: TableEditorWidget) {
    return other.match.from === this.match.from
      && other.match.source === this.match.source
      && other.match.computedSignature === this.match.computedSignature;
  }

  get estimatedHeight() {
    return Math.max(1, ...this.match.cells.map((cell) => cell.row)) * 38 + 24;
  }

  toDOM(view: EditorView) {
    const wrapper = document.createElement("div");
    wrapper.className = `cm-table-preview ${TABLE_WIDGET_CLASS}`;
    wrapper.setAttribute("contenteditable", "false");
    wrapper.setAttribute("aria-label", "Table. Click a cell to edit; Tab moves to the next cell.");

    const scroll = document.createElement("div");
    scroll.className = "cm-table-preview-scroll";
    scroll.appendChild(buildTable(this.match));
    wrapper.appendChild(scroll);
    setTableHandle(wrapper, handleFor(this.match));
    matchByWrapper.set(wrapper, this.match);
    attachCellHandlers(wrapper, view);
    return wrapper;
  }

  updateDOM(dom: HTMLElement, view: EditorView) {
    const previous = getTableHandle(dom);
    if (!previous) return false;
    if (shapeOf(previous.cells) !== shapeOf(this.match.cells)) {
      // Rows/columns changed: the grid is rebuilt. If that happened under
      // a focused cell without a command re-focusing one (undo/redo of a
      // structural edit), return focus to the same row/column.
      const active = dom.ownerDocument.activeElement;
      const key = active instanceof HTMLElement && dom.contains(active) ? active.getAttribute(CELL_ATTR) : null;
      if (key) refocusLater(view, this.match, key);
      return false;
    }
    syncTable(dom, this.match);
    setTableHandle(dom, handleFor(this.match));
    matchByWrapper.set(dom, this.match);
    refreshHandles(dom);
    return true;
  }

  ignoreEvent() {
    return true;
  }
}

interface TableDisplayState {
  matches: TableDisplayMatch[];
  decorations: DecorationSet;
}

function buildTableDisplayState(state: EditorState): TableDisplayState {
  const matches = collectTableDisplayMatches(state);
  const ranges: Range<Decoration>[] = matches.map((match) =>
    Decoration.replace({
      widget: new TableEditorWidget(match),
      block: true,
      inclusive: true,
    }).range(match.from, match.to),
  );
  return { matches, decorations: Decoration.set(ranges, true) };
}

export const tableDisplayField = StateField.define<TableDisplayState>({
  create: buildTableDisplayState,
  update(value, transaction) {
    // Selection-only changes no longer matter (tables never switch back to
    // raw text), but the syntax tree can grow without a doc change as the
    // background parser catches up.
    if (
      !transaction.docChanged
      && syntaxTree(transaction.startState) === syntaxTree(transaction.state)
      && !transaction.effects.some((effect) => effect.is(setFormulaFileTables))
    ) {
      return value;
    }
    return buildTableDisplayState(transaction.state);
  },
  provide: (field) => [
    EditorView.decorations.from(field, (value) => value.decorations),
    EditorView.atomicRanges.of((view) => view.state.field(field).decorations),
  ],
});

// When the editor's own caret lands on a table by any other route (undo
// restoring a selection inside one, a template inserting one, Page Up/Down),
// hand keyboard focus to the nearest cell so typing continues inside the
// grid. Arrow keys are handled up front by tableVerticalEntry below.
const tableCaretEntry = ViewPlugin.fromClass(class {
  update(update: ViewUpdate) {
    if (!update.selectionSet || !update.view.hasFocus) return;
    const selection = update.state.selection.main;
    if (!selection.empty) return;
    const head = selection.head;
    const match = update.state.field(tableDisplayField).matches.find((m) => head >= m.from && head <= m.to);
    if (!match) return;
    // Atomic ranges snap the caret to either edge of the table, so use
    // where it came from: from above → first cell, from below → last cell.
    const previous = update.startState.selection.main.head;
    const fromAbove = previous < match.from;
    const target = fromAbove ? match.from : previous > match.to ? match.to : head;
    const view = update.view;
    queueMicrotask(() => {
      if (view.state.selection.main.head !== head || !view.hasFocus) return;
      focusTableCellAt(view, target, fromAbove ? "start" : "end");
    });
  }
});

// Focuses the cell in `match`'s top or bottom row that sits under screen
// x-coordinate `x` (nearest column when x is outside the table).
function focusEdgeCell(view: EditorView, match: TableDisplayMatch, edge: "top" | "bottom", x: number | null): boolean {
  for (const dom of view.dom.querySelectorAll<HTMLElement>(`.${TABLE_WIDGET_CLASS}`)) {
    if (getTableHandle(dom)?.from !== match.from) continue;
    const table = dom.querySelector("table");
    const row = edge === "top" ? table?.rows[0] : table?.rows[table.rows.length - 1];
    const cells = [...(row?.cells ?? [])].filter((cell) => cell.hasAttribute(CELL_ATTR));
    if (cells.length === 0) return false;
    let target = cells[0];
    if (x !== null) {
      let best = Infinity;
      for (const cell of cells) {
        const rect = cell.getBoundingClientRect();
        const distance = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
        if (distance < best) {
          best = distance;
          target = cell;
        }
      }
    }
    focusCellElement(target, edge === "top" ? "start" : "end");
    return true;
  }
  return false;
}

// ↑/↓ from the text around a table. CodeMirror's own vertical motion
// treats the grid as one atomic block and can land on either edge of it —
// or skip over it entirely — leaving the caret "before the table" when
// arrowing up from below. Instead, whenever a vertical move would reach or
// cross a table, go into its nearest row, in the column under the caret.
function enterTableVertically(view: EditorView, forward: boolean): boolean {
  const selection = view.state.selection.main;
  if (!selection.empty) return false;
  const next = view.moveVertically(selection, forward);
  const match = view.state.field(tableDisplayField).matches.find((m) =>
    forward
      ? selection.head < m.from && next.head >= m.from
      : selection.head > m.to && next.head <= m.to,
  );
  if (!match) return false;
  const x = view.coordsAtPos(selection.head)?.left ?? null;
  return focusEdgeCell(view, match, forward ? "top" : "bottom", x);
}

const tableVerticalEntry = Prec.high(keymap.of([
  { key: "ArrowUp", run: (view) => enterTableVertically(view, false) },
  { key: "ArrowDown", run: (view) => enterTableVertically(view, true) },
]));

export const tableDisplayExtension: Extension = [
  formulaFileTablesField,
  tableDisplayField,
  tableCaretEntry,
  tableVerticalEntry,
];
