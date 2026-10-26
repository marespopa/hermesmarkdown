import { syntaxTree } from "@codemirror/language";
import type { SyntaxNode } from "@lezer/common";
import { EditorState, Extension, Prec, Range, StateField, type Transaction } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, keymap, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { type CellOffset, getTableCellOffsetsFromSource } from "../utils/table-cell-offsets";
import { type Alignment, parseTable, type TableData } from "../utils/tableParser";
import { buildTable, handleFor, matchByWrapper, refreshHandles, shapeOf, syncTable } from "./table-cell-dom";
import { attachCellHandlers, refocusLater } from "./table-cell-handlers";
import { CELL_ATTR, focusCellElement, focusTableCellAt, getTableHandle, setTableHandle, TABLE_WIDGET_CLASS } from "./table-focus";
import { type ComputedCell, computeTableFormulas, formulaFileTablesField, setFormulaFileTables } from "./table-formulas";
import { tableSourceBlock, tableSourceField } from "./table-source";
import { maskQuotedRows, quotedRowPrefix } from "../utils/quoted-table";
import { quoteFrameClass } from "./table-quote-frame";
import { addRange, coversAll, mapRanges, type Range as Stretch, revealTablesIn, STAGED_REVEAL_LINES } from "./table-stages";
import { stagedTableReveal } from "./table-stage-reveal";

// Tables are always shown as a rendered grid whose cells are edited in
// place — the pipe syntax is never visible. The document stays the single
// source of truth: every keystroke in a cell is written straight back as a
// minimal change to that cell's source range, so undo/redo, autosave,
// and merges all see the table exactly as displayed.

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
  /** A table in a quote or callout: the frame that carries its tint or bar on. */
  frame: string;
}

// A table as found in the document, before its formulas are computed.
interface FoundTable {
  from: number;
  to: number;
  source: string;
  data: TableData;
  frame: string;
  cells: CellOffset[];
  /** Its formula results, kept while no table and no table's name changes. */
  computed?: Map<string, ComputedCell>;
}

function foundTable(state: EditorState, node: SyntaxNode): FoundTable | null {
  // In a quote or callout the grid takes the rows' whole lines, `>`s
  // included; its source is read through the mask (utils/quoted-table.ts),
  // so cell offsets stay those of the document.
  const line = state.doc.lineAt(node.from);
  const quoted = line.from < node.from && quotedRowPrefix(line.text) !== "";
  const from = quoted ? line.from : node.from;
  const raw = state.doc.sliceString(from, node.to);
  const source = quoted ? maskQuotedRows(raw) : raw;
  const data = parseTable(source);
  if (!data) return null;
  const frame = quoted ? quoteFrameClass(state, node) : "";
  return { from, to: node.to, source, data, frame, cells: getTableCellOffsetsFromSource(source, from) };
}

// Every table in the document, or only those overlapping `ranges`.
function findTables(state: EditorState, ranges?: readonly { from: number; to: number }[]): FoundTable[] {
  const found: FoundTable[] = [];
  const tree = syntaxTree(state);
  for (const range of ranges ?? [{ from: 0, to: state.doc.length }]) {
    tree.iterate({
      from: range.from,
      to: range.to,
      enter(node) {
        if (node.name !== "Table") return;
        const table = foundTable(state, node.node);
        if (table && !found.some((other) => other.from === table.from)) found.push(table);
        return false;
      },
    });
  }
  return found.sort((a, b) => a.from - b.from);
}

// An edit that can change which lines are tables away from where it happened:
// a code fence, a quote's `>`, an HTML block. The tables are found again
// throughout.
const REGEX_STRUCTURAL = /[`~<>]/;

const withoutResults = (table: FoundTable): FoundTable => ({ ...table, computed: undefined });

// An edit that can rename a table for formulas (`=Income!B3`): a heading
// typed or removed, or lines moving a heading out of reach.
const REGEX_RENAMES = /[#\n]/;

// The tables after `transaction`, kept up to date with only the edited
// lines looked at again: a note's tables aren't searched for on every
// keystroke. Tables the edit doesn't touch (or sit next to) move with the
// text, and keep their formula results unless a table or a table's name
// may have changed; null when everything has to be found again.
function updateTables(tables: readonly FoundTable[], transaction: Transaction): FoundTable[] | null {
  const { changes, startState, state } = transaction;
  let structural = false;
  let renames = false;
  const edited: { from: number; to: number }[] = [];
  changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
    if (REGEX_STRUCTURAL.test(startState.sliceDoc(fromA, toA)) || REGEX_STRUCTURAL.test(inserted.toString())) {
      structural = true;
    }
    if (REGEX_RENAMES.test(startState.sliceDoc(fromA, toA)) || REGEX_RENAMES.test(inserted.toString())) renames = true;
    // One line either side: a row typed under a table, or a blank line
    // removed above one, joins it.
    const first = state.doc.lineAt(fromB).number;
    const last = state.doc.lineAt(toB).number;
    edited.push({
      from: state.doc.line(Math.max(1, first - 1)).from,
      to: state.doc.line(Math.min(state.doc.lines, last + 1)).to,
    });
  });
  // The parse must reach the edited lines to see the tables in them.
  if (structural || edited.some((range) => syntaxTree(state).length < range.to)) return null;
  const doc = startState.doc;
  const kept = tables
    .filter((table) => {
      const before = doc.line(Math.max(1, doc.lineAt(table.from).number - 1)).from;
      const after = doc.line(Math.min(doc.lines, doc.lineAt(table.to).number + 1)).to;
      return !changes.touchesRange(before, after);
    })
    .map((table) => {
      const shift = changes.mapPos(table.from) - table.from;
      if (shift === 0) return table;
      const cells = table.cells.map((cell) => ({
        ...cell,
        start: cell.start + shift,
        end: cell.end + shift,
        fullStart: cell.fullStart + shift,
        fullEnd: cell.fullEnd + shift,
      }));
      return { ...table, from: table.from + shift, to: table.to + shift, cells };
    });
  const fresh = findTables(state, edited).filter((table) => !kept.some((other) => other.from === table.from));
  const next = [...kept, ...fresh].sort((a, b) => a.from - b.from);
  const unchanged = !renames && fresh.length === 0 && kept.length === tables.length;
  return unchanged ? next : next.map(withoutResults);
}

// Fills in each table's formula results: all at once, since one table's
// formulas can read another's, unless every table still has its own.
function withFormulas(state: EditorState, found: readonly FoundTable[]): TableDisplayMatch[] {
  if (found.some((table) => !table.computed)) {
    const results = computeTableFormulas(state, found as FoundTable[]);
    found.forEach((table, i) => { table.computed = results[i]; });
  }
  const computed = found.map((table) => table.computed!);
  return found.map((table, i) => ({
    from: table.from,
    to: table.to,
    source: table.source,
    cells: table.cells,
    alignments: table.data.alignments,
    computed: computed[i],
    computedSignature: [...computed[i]].map(([key, cell]) => `${key}=${cell.display}`).join("\u0001"),
    frame: table.frame,
  }));
}

export function collectTableDisplayMatches(state: EditorState): TableDisplayMatch[] {
  return withFormulas(state, findTables(state));
}

// Escaped pipes are a storage detail: cells show and edit a plain "|".

class TableEditorWidget extends WidgetType {
  constructor(private readonly match: TableDisplayMatch) {
    super();
  }

  eq(other: TableEditorWidget) {
    return other.match.from === this.match.from
      && other.match.source === this.match.source
      && other.match.computedSignature === this.match.computedSignature
      && other.match.frame === this.match.frame;
  }

  get estimatedHeight() {
    return Math.max(1, ...this.match.cells.map((cell) => cell.row)) * 38 + 24;
  }

  toDOM(view: EditorView) {
    const wrapper = document.createElement("div");
    wrapper.className = `cm-table-preview ${TABLE_WIDGET_CLASS}${this.match.frame ? ` ${this.match.frame}` : ""}`;
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
  tables: FoundTable[];
  matches: TableDisplayMatch[];
  decorations: DecorationSet;
  /** A large note's stretches searched for tables so far (table-stages.ts); null once it's all of it. */
  covered: Stretch[] | null;
}

function buildTableDisplayState(state: EditorState, tables: FoundTable[] = findTables(state), covered: Stretch[] | null = null): TableDisplayState {
  // A table opened with "Edit as Markdown" stays plain text (table-source.ts).
  const source = tableSourceBlock(state);
  const matches = withFormulas(state, tables).filter((match) =>
    !source || match.to < source.from || match.from > source.to);
  const ranges: Range<Decoration>[] = matches.map((match) =>
    Decoration.replace({
      widget: new TableEditorWidget(match),
      block: true,
      inclusive: true,
    }).range(match.from, match.to),
  );
  return { tables, matches, decorations: Decoration.set(ranges, true), covered };
}

// The tables in a large note's `covered` stretches, or in the whole note.
const tablesIn = (state: EditorState, covered: Stretch[] | null) => (covered ? findTables(state, covered) : findTables(state));

export const tableDisplayField = StateField.define<TableDisplayState>({
  // A large note starts with no tables found: the text shows first, and
  // stagedTableReveal finds them, the screen's first (table-stages.ts).
  create: (state) => (state.doc.lines > STAGED_REVEAL_LINES ? buildTableDisplayState(state, [], []) : buildTableDisplayState(state)),
  update(value, transaction) {
    // Selection-only changes no longer matter (tables never switch back to
    // raw text), but the syntax tree can grow without a doc change as the
    // background parser catches up: then every table is found again.
    const treeChanged = syntaxTree(transaction.startState) !== syntaxTree(transaction.state);
    const { state } = transaction;
    if (transaction.docChanged) {
      const covered = value.covered && mapRanges(value.covered, transaction.changes);
      const tables = updateTables(value.tables, transaction);
      return buildTableDisplayState(state, tables ?? tablesIn(state, covered), covered);
    }
    const reveals = transaction.effects.filter((effect) => effect.is(revealTablesIn));
    if (value.covered && reveals.length > 0) {
      let covered: Stretch[] | null = value.covered;
      const tables = [...value.tables];
      for (const { value: range } of reveals) {
        covered = addRange(covered, range);
        for (const table of findTables(state, [range])) if (!tables.some((other) => other.from === table.from)) tables.push(table);
      }
      if (coversAll(covered, state.doc.length)) covered = null;
      return buildTableDisplayState(state, tables.sort((a, b) => a.from - b.from), covered);
    }
    if (treeChanged) return buildTableDisplayState(state, tablesIn(state, value.covered), value.covered);
    if (
      transaction.effects.some((effect) => effect.is(setFormulaFileTables))
      || transaction.startState.field(tableSourceField, false) !== transaction.state.field(tableSourceField, false)
    ) {
      const fileTables = transaction.effects.some((effect) => effect.is(setFormulaFileTables));
      return buildTableDisplayState(
        transaction.state,
        fileTables ? value.tables.map(withoutResults) : value.tables,
        value.covered,
      );
    }
    return value;
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
  tableSourceField,
  tableDisplayField,
  stagedTableReveal((state) => state.field(tableDisplayField, false)?.covered ?? null),
  tableCaretEntry,
  tableVerticalEntry,
];
