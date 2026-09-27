import { EditorSelection, EditorState, Extension, Range, StateField } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { undo, redo } from "@codemirror/commands";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { parseTable, type Alignment } from "../utils/tableParser";
import {
  getTableCellOffsetsFromSource,
  type CellOffset,
} from "../utils/table-cell-offsets";
import { renderInlineMarkdown } from "../utils/inline-markdown";
import { detectDelimitedTable, parseDelimitedText } from "../utils/table-manipulation";
import {
  CELL_ATTR,
  TABLE_WIDGET_CLASS,
  cellKey,
  exitTable,
  focusCellElement,
  focusTableCellAt,
  getTableHandle,
  placeCaret,
  setTableHandle,
  type TableWidgetHandle,
} from "./table-focus";
import {
  addColumnAction,
  addRowAction,
  appendRowAction,
  copyCSVAction,
  copyJSONAction,
  findTableInState,
  insertColumnLeftAction,
  insertRowAboveAction,
  moveColumnAction,
  moveRowAction,
  normalizeTableSource,
  pasteGridAction,
  removeColumnAction,
  removeRowAction,
  removeTableAction,
  setAlignmentAction,
  sortColumnAction,
} from "./table-commands";
import { closeTableMenu, createColumnTab, showTableMenu, type TableColumnTab, type TableMenuEntry } from "./table-handles";
import { formatShortcut, isMacPlatform } from "@/app/utils/platform";

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
}

export function collectTableDisplayMatches(state: EditorState): TableDisplayMatch[] {
  const matches: TableDisplayMatch[] = [];

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name !== "Table") return;
      const source = state.doc.sliceString(node.from, node.to);
      const data = parseTable(source);
      if (!data) return;
      matches.push({
        from: node.from,
        to: node.to,
        source,
        cells: getTableCellOffsetsFromSource(source, node.from),
        alignments: data.alignments,
      });
    },
  });

  return matches;
}

// Escaped pipes are a storage detail: cells show and edit a plain "|".
const toDisplay = (raw: string) => raw.replace(/\\\|/g, "|");
const toRaw = (display: string) =>
  display.replace(/ /g, " ").replace(/\s*\n\s*/g, " ").trim().replace(/\\?\|/g, "\\|");

function renderCell(el: HTMLElement, raw: string) {
  el.dataset.raw = raw;
  el.innerHTML = renderInlineMarkdown(raw);
}

const shapeOf = (cells: CellOffset[]) => cells.map(cellKey).join(",");

const tabsByWrapper = new WeakMap<HTMLElement, TableColumnTab>();

// Re-positions a table's column tab on the next frame (after layout has
// caught up with typing, which can change column widths).
function refreshHandles(wrapper: HTMLElement) {
  const handles = tabsByWrapper.get(wrapper);
  if (!handles) return;
  const nextFrame = globalThis.requestAnimationFrame ?? ((fn: () => void) => setTimeout(fn, 16));
  nextFrame(() => {
    const active = wrapper.ownerDocument.activeElement;
    handles.update(active instanceof HTMLElement && wrapper.contains(active) && active.hasAttribute(CELL_ATTR) ? active : null);
  });
}

const altHint = (key: string) => (isMacPlatform() ? `⌥${key}` : `Alt+${key}`);

function handleFor(match: TableDisplayMatch): TableWidgetHandle {
  return { from: match.from, to: match.to, source: match.source, cells: match.cells };
}

function buildTable(match: TableDisplayMatch): HTMLTableElement {
  const table = document.createElement("table");
  const thead = table.createTHead();
  const tbody = table.createTBody();
  const byKey = new Map(match.cells.map((cell) => [cellKey(cell), cell]));
  const rowCount = Math.max(1, ...match.cells.map((cell) => cell.row));
  const colCount = match.cells.filter((cell) => cell.row === 1).length;

  for (let row = 1; row <= rowCount; row++) {
    const tr = (row === 1 ? thead : tbody).insertRow();
    for (let col = 0; col < colCount; col++) {
      const el = document.createElement(row === 1 ? "th" : "td");
      el.style.textAlign = match.alignments[col] ?? "left";
      const cell = byKey.get(`${row}:${col}`);
      if (cell) {
        el.setAttribute(CELL_ATTR, cellKey(cell));
        el.setAttribute("contenteditable", "true");
        el.tabIndex = -1;
        el.spellcheck = true;
        renderCell(el, cell.text);
      } else {
        // Ragged row: nothing to edit until the table is next realigned
        // (leaving the table pads every row to the header's width).
        el.className = "cm-table-cell-missing";
      }
      tr.appendChild(el);
    }
  }
  return table;
}

// Brings an existing grid up to date with `match` without replacing any
// DOM, so the cell being typed in keeps its focus and caret.
function syncTable(dom: HTMLElement, match: TableDisplayMatch) {
  const active = dom.ownerDocument.activeElement;
  for (const cell of match.cells) {
    const el = dom.querySelector<HTMLElement>(`[${CELL_ATTR}="${cellKey(cell)}"]`);
    if (!el) continue;
    el.style.textAlign = match.alignments[cell.col] ?? "left";
    if (el === active) {
      // Only rewrite the focused cell when the source changed underneath
      // it (undo/redo, another pane) — never for the user's own typing.
      if (toRaw(el.textContent ?? "") !== cell.text) {
        el.textContent = toDisplay(cell.text);
        placeCaret(el, "end");
      }
      el.dataset.raw = cell.text;
    } else if (el.dataset.raw !== cell.text) {
      renderCell(el, cell.text);
    }
  }
}

function caretOffsetIn(el: HTMLElement): number | null {
  const selection = el.ownerDocument.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!range.collapsed || !el.contains(range.startContainer)) return null;
  const before = el.ownerDocument.createRange();
  before.selectNodeContents(el);
  before.setEnd(range.startContainer, range.startOffset);
  return before.toString().length;
}

function selectionOffsetsIn(el: HTMLElement): { start: number; end: number } | null {
  const selection = el.ownerDocument.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!el.contains(range.startContainer) || !el.contains(range.endContainer)) return null;
  const before = el.ownerDocument.createRange();
  before.selectNodeContents(el);
  before.setEnd(range.startContainer, range.startOffset);
  const start = before.toString().length;
  return { start, end: start + range.toString().length };
}

function setCaretOffset(el: HTMLElement, offset: number) {
  const text = el.firstChild;
  const selection = el.ownerDocument.getSelection();
  if (!selection) return;
  const range = el.ownerDocument.createRange();
  if (text && text.nodeType === Node.TEXT_NODE) {
    range.setStart(text, Math.min(offset, text.textContent?.length ?? 0));
  } else {
    range.selectNodeContents(el);
    range.collapse(false);
  }
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

class TableEditorWidget extends WidgetType {
  constructor(private readonly match: TableDisplayMatch) {
    super();
  }

  eq(other: TableEditorWidget) {
    return other.match.from === this.match.from && other.match.source === this.match.source;
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
    refreshHandles(dom);
    return true;
  }

  ignoreEvent() {
    return true;
  }
}

function refocusLater(view: EditorView, match: TableDisplayMatch, key: string) {
  const [row, col] = key.split(":").map(Number);
  queueMicrotask(() => {
    const active = view.dom.ownerDocument.activeElement;
    if (active instanceof HTMLElement && active.closest(`.${TABLE_WIDGET_CLASS}`)) return;
    for (const dom of view.dom.querySelectorAll<HTMLElement>(`.${TABLE_WIDGET_CLASS}`)) {
      const handle = getTableHandle(dom);
      if (!handle || handle.from !== match.from) continue;
      const maxRow = Math.max(...handle.cells.map((cell) => cell.row));
      const maxCol = Math.max(...handle.cells.filter((cell) => cell.row === 1).map((cell) => cell.col));
      const el = dom.querySelector<HTMLElement>(`[${CELL_ATTR}="${Math.min(row, maxRow)}:${Math.min(col, maxCol)}"]`);
      if (el) focusCellElement(el);
      return;
    }
  });
}

function attachCellHandlers(wrapper: HTMLElement, view: EditorView) {
  const cellOf = (target: EventTarget | null) =>
    target instanceof Element ? target.closest<HTMLElement>(`[${CELL_ATTR}]`) : null;
  const offsetOf = (el: HTMLElement) =>
    getTableHandle(wrapper)?.cells.find((cell) => cellKey(cell) === el.getAttribute(CELL_ATTR));
  const cellAt = (row: number, col: number) =>
    wrapper.querySelector<HTMLElement>(`[${CELL_ATTR}="${row}:${col}"]`);
  const orderedCells = () => [...wrapper.querySelectorAll<HTMLElement>(`[${CELL_ATTR}]`)];
  const tableInfoFor = (el: HTMLElement) => {
    const cell = offsetOf(el);
    return cell ? findTableInState(view.state, cell.start) : null;
  };
  const exit = (side: "before" | "after") => {
    const handle = getTableHandle(wrapper);
    if (handle) exitTable(view, handle, side);
  };

  // Writes the cell's current text back into the document.
  const commitCell = (el: HTMLElement) => {
    const cell = offsetOf(el);
    if (!cell) return;
    const raw = toRaw(el.textContent ?? "");
    if (raw === cell.text) return;
    el.dataset.raw = raw;
    view.dispatch({
      changes: { from: cell.start, to: cell.end, insert: raw },
      selection: EditorSelection.cursor(cell.start),
      userEvent: "input.type.table",
    });
  };

  // One menu for everything, Google Docs-style: rows, then columns, then
  // the whole table — opened by right-click on a cell or the column tab.
  const menuFor = (el: HTMLElement): TableMenuEntry[] => {
    const cell = offsetOf(el);
    const handle = getTableHandle(wrapper);
    const run = (action: (info: NonNullable<ReturnType<typeof tableInfoFor>>) => void) => () => {
      const info = tableInfoFor(el);
      if (info) action(info);
    };
    const colCount = handle ? handle.cells.filter((c) => c.row === 1).length : 0;
    const rowCount = handle ? Math.max(...handle.cells.map((c) => c.row)) : 0;
    const col = cell?.col ?? 0;
    const row = cell?.row ?? 1;
    const align = el.closest("table")?.tHead?.rows[0]?.cells[col]?.style.textAlign || "left";
    const alignLabel = (value: string, label: string) => (align === value ? `${label} ✓` : label);
    const isHeader = row <= 1;

    return [
      ...(isHeader
        ? []
        : ([
            { heading: "Row" },
            { label: "Insert row above", run: run((info) => insertRowAboveAction(view, info)) },
            { label: "Insert row below", hint: formatShortcut("↵"), run: run((info) => addRowAction(view, info)) },
            { label: "Move row up", hint: altHint("↑"), disabled: row <= 2, run: run((info) => moveRowAction(view, info, -1)) },
            { label: "Move row down", hint: altHint("↓"), disabled: row >= rowCount, run: run((info) => moveRowAction(view, info, 1)) },
            { label: "Delete row", hint: formatShortcut("⌫", { shift: true }), danger: true, run: run((info) => removeRowAction(view, info)) },
            { separator: true },
          ] as TableMenuEntry[])),
      { heading: "Column" },
      { label: "Insert column left", run: run((info) => insertColumnLeftAction(view, info)) },
      { label: "Insert column right", run: run((info) => addColumnAction(view, info)) },
      { label: "Move column left", hint: formatShortcut("←", { alt: true }), disabled: col === 0, run: run((info) => moveColumnAction(view, info, -1)) },
      { label: "Move column right", hint: formatShortcut("→", { alt: true }), disabled: col >= colCount - 1, run: run((info) => moveColumnAction(view, info, 1)) },
      { label: "Sort A → Z", run: run((info) => sortColumnAction(view, info, "asc")) },
      { label: "Sort Z → A", run: run((info) => sortColumnAction(view, info, "desc")) },
      { label: alignLabel("left", "Align left"), run: run((info) => setAlignmentAction(view, info, "left")) },
      { label: alignLabel("center", "Align center"), run: run((info) => setAlignmentAction(view, info, "center")) },
      { label: alignLabel("right", "Align right"), run: run((info) => setAlignmentAction(view, info, "right")) },
      { label: "Delete column", danger: true, disabled: colCount <= 1, run: run((info) => removeColumnAction(view, info)) },
      { separator: true },
      { heading: "Table" },
      { label: "Copy as CSV", run: run((info) => copyCSVAction(info)) },
      { label: "Copy as JSON", run: run((info) => copyJSONAction(info)) },
      { label: "Delete table", confirmLabel: "Click again to delete", danger: true, run: run((info) => removeTableAction(view, info)) },
    ];
  };

  const scroll = wrapper.querySelector<HTMLElement>(".cm-table-preview-scroll");
  const tab = scroll ? createColumnTab(scroll, menuFor) : null;
  if (tab) tabsByWrapper.set(wrapper, tab);

  wrapper.addEventListener("contextmenu", (event) => {
    const el = cellOf(event.target);
    if (!el) return;
    event.preventDefault();
    if (el.ownerDocument.activeElement !== el) focusCellElement(el);
    showTableMenu({ x: event.clientX, y: event.clientY, doc: el.ownerDocument }, menuFor(el), "Table options");
  });

  // Typing hides the tab entirely; moving the pointer brings it back.
  wrapper.addEventListener("pointermove", () => tab?.setTyping(false));

  wrapper.addEventListener("focusin", (event) => {
    const el = cellOf(event.target);
    if (!el) return;
    el.classList.add("cm-table-cell-editing");
    refreshHandles(wrapper);
    const cell = offsetOf(el);
    if (cell && el.textContent !== toDisplay(cell.text)) {
      el.textContent = toDisplay(cell.text);
      placeCaret(el, "end");
    }
    // Deferred: focus can arrive while CodeMirror is mid-update/measure,
    // where dispatching throws.
    queueMicrotask(() => {
      if (!el.isConnected || el.ownerDocument.activeElement !== el) return;
      const handle = getTableHandle(wrapper);
      // The line-based table commands need outer pipes; valid tables
      // written as `A | B` get them (invisibly) on first edit.
      if (handle && !handle.source.trimStart().startsWith("|")) {
        normalizeTableSource(view, handle.from, handle.to);
      }
      const current = offsetOf(el);
      if (!current) return;
      const sel = view.state.selection.main;
      // Moving the (hidden) CM caret into the cell keeps the table toolbar
      // and every caret-based table command pointed at this cell.
      if (!sel.empty || sel.head < current.fullStart || sel.head > current.fullEnd) {
        view.dispatch({ selection: EditorSelection.cursor(current.start) });
      }
    });
  });

  wrapper.addEventListener("focusout", (event) => {
    const el = cellOf(event.target);
    if (!el) return;
    el.classList.remove("cm-table-cell-editing");
    renderCell(el, offsetOf(el)?.text ?? el.dataset.raw ?? "");
    const next = (event as FocusEvent).relatedTarget;
    if (!(next instanceof Node && wrapper.contains(next))) {
      closeTableMenu();
      tab?.update(null);
    }
  });

  wrapper.addEventListener("input", (event) => {
    const el = cellOf(event.target);
    if (el) commitCell(el);
    refreshHandles(wrapper);
  });

  wrapper.addEventListener("beforeinput", (event) => {
    const type = (event as InputEvent).inputType;
    if (type.startsWith("format") || type === "insertParagraph" || type === "insertLineBreak" || type === "insertFromDrop") {
      event.preventDefault();
    }
  });

  wrapper.addEventListener("drop", (event) => event.preventDefault());

  // Rendered links stay reachable: Ctrl/Cmd+click opens them.
  wrapper.addEventListener("mousedown", (event) => {
    if (!(event.metaKey || event.ctrlKey)) return;
    const link = (event.target as Element | null)?.closest?.("a[href]");
    if (!link) return;
    event.preventDefault();
    window.open(link.getAttribute("href")!, "_blank", "noopener,noreferrer");
  });

  wrapper.addEventListener("paste", (event) => {
    const el = cellOf(event.target);
    if (!el) return;
    event.preventDefault();
    event.stopPropagation();
    const text = (event.clipboardData?.getData("text/plain") ?? "").replace(/\r\n/g, "\n").replace(/\n+$/, "");
    if (!text) return;

    // Spreadsheet selections (TSV) or multi-line CSV fill cells from here.
    const delimiter = text.includes("\t") ? "\t" : text.includes("\n") ? detectDelimitedTable(text) : null;
    if (delimiter) {
      const info = tableInfoFor(el);
      if (info && pasteGridAction(view, info, parseDelimitedText(text, delimiter))) return;
    }

    const selection = el.ownerDocument.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = el.ownerDocument.createTextNode(text.replace(/\s*\n\s*/g, " "));
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    el.normalize();
    commitCell(el);
  });

  wrapper.addEventListener("keydown", (event) => {
    const el = cellOf(event.target);
    if (!el || event.isComposing) return;
    const cell = offsetOf(el);
    if (!cell) return;
    if (event.key.length === 1 || event.key === "Backspace" || event.key === "Delete") tab?.setTyping(true);
    const mod = event.metaKey || event.ctrlKey;
    const plain = !mod && !event.altKey && !event.shiftKey;
    const handled = () => {
      event.preventDefault();
      event.stopPropagation();
    };
    const focus = (target: HTMLElement | null | undefined, where: "start" | "end" = "end") => {
      if (!target) return false;
      focusCellElement(target, where);
      return true;
    };
    const cells = orderedCells();
    const index = cells.indexOf(el);

    if (event.key === "Tab" && !mod && !event.altKey) {
      handled();
      if (event.shiftKey) {
        if (!focus(cells[index - 1])) exit("before");
      } else if (!focus(cells[index + 1])) {
        const info = tableInfoFor(el);
        if (info) appendRowAction(view, info);
      }
      return;
    }

    if (event.key === "Enter") {
      handled();
      if (mod && !event.shiftKey) {
        const info = tableInfoFor(el);
        if (info) addRowAction(view, info);
      } else if (!mod && !focus(cellAt(cell.row + 1, cell.col))) {
        const info = tableInfoFor(el);
        if (info) appendRowAction(view, info);
      }
      return;
    }

    if (event.key === "Escape") {
      handled();
      exit("after");
      return;
    }

    if (event.altKey && !mod && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      handled();
      const info = tableInfoFor(el);
      if (info) moveRowAction(view, info, event.key === "ArrowUp" ? -1 : 1);
      return;
    }

    if (mod && event.altKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      handled();
      const info = tableInfoFor(el);
      if (info) moveColumnAction(view, info, event.key === "ArrowLeft" ? -1 : 1);
      return;
    }

    if (mod && event.shiftKey && event.key === "Backspace") {
      handled();
      const info = tableInfoFor(el);
      if (info && cell.row > 1) removeRowAction(view, info);
      return;
    }

    if (plain && event.key === "ArrowUp") {
      handled();
      if (!focus(cellAt(cell.row - 1, cell.col))) exit("before");
      return;
    }

    if (plain && event.key === "ArrowDown") {
      handled();
      if (!focus(cellAt(cell.row + 1, cell.col))) exit("after");
      return;
    }

    if (plain && event.key === "ArrowLeft" && caretOffsetIn(el) === 0) {
      handled();
      if (!focus(cells[index - 1])) exit("before");
      return;
    }

    if (plain && event.key === "ArrowRight" && caretOffsetIn(el) === (el.textContent ?? "").length) {
      handled();
      if (!focus(cells[index + 1], "start")) exit("after");
      return;
    }

    const key = event.key.toLowerCase();
    if (mod && !event.altKey && (key === "z" || key === "y")) {
      handled();
      if (key === "y" || event.shiftKey) redo(view);
      else undo(view);
      if (!focusTableCellAt(view, view.state.selection.main.head)) view.focus();
      return;
    }

    const marker = mod && !event.altKey && !event.shiftKey
      ? ({ b: "**", i: "*", e: "`" } as Record<string, string>)[key]
      : undefined;
    if (marker) {
      handled();
      const offsets = selectionOffsetsIn(el);
      if (!offsets) return;
      const text = el.textContent ?? "";
      el.textContent =
        text.slice(0, offsets.start) + marker + text.slice(offsets.start, offsets.end) + marker + text.slice(offsets.end);
      setCaretOffset(el, offsets.end + marker.length);
      commitCell(el);
    }
  });
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
    if (!transaction.docChanged && syntaxTree(transaction.startState) === syntaxTree(transaction.state)) {
      return value;
    }
    return buildTableDisplayState(transaction.state);
  },
  provide: (field) => [
    EditorView.decorations.from(field, (value) => value.decorations),
    EditorView.atomicRanges.of((view) => view.state.field(field).decorations),
  ],
});

// When the editor's own caret lands on a table (arrow keys from the line
// above/below, undo restoring a selection inside one), hand keyboard focus
// to the nearest cell so typing continues inside the grid.
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

export const tableDisplayExtension: Extension = [tableDisplayField, tableCaretEntry];
