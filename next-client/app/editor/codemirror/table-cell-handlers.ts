import { formatShortcut } from "@/app/utils/platform";
import { redo, undo } from "@codemirror/commands";
import { EditorSelection } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { detectDelimitedTable, parseDelimitedText } from "../utils/table-manipulation";
import { altHint, caretOffsetIn, matchByWrapper, refreshHandles, renderCell, rulersByWrapper, selectionOffsetsIn, setCaretOffset, toDisplay, toRaw } from "./table-cell-dom";
import { addColumnAction, addRowAction, appendRowAction, copyCSVAction, copyJSONAction, findTableInState, insertColumnLeftAction, insertRowAboveAction, moveColumnAction, moveRowAction, normalizeTableSource, pasteGridAction, removeColumnAction, removeRowAction, removeTableAction, setAlignmentAction, sortColumnAction, sumColumnAction } from "./table-commands";
import type { TableDisplayMatch } from "./table-display";
import { CELL_ATTR, cellKey, exitTable, focusCellElement, focusTableCellAt, getTableHandle, placeCaret, TABLE_WIDGET_CLASS } from "./table-focus";
import { closeTableMenu, createTableRulers, showTableMenu, type TableMenuEntry } from "./table-handles";
import { editTableSource } from "./table-source";

// Event wiring for the inline table widget: cell editing, keyboard
// navigation, paste, the row/column/table menu, and the rulers.
export function refocusLater(view: EditorView, match: TableDisplayMatch, key: string) {
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

export function attachCellHandlers(wrapper: HTMLElement, view: EditorView) {
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
  // Swaps the grid for its pipe source, caret at the start of `el`'s text.
  const editSource = (el: HTMLElement) => {
    const handle = getTableHandle(wrapper);
    if (handle) editTableSource(view, handle.from, offsetOf(el)?.start ?? handle.from);
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
  // the whole table — opened by right-click on a cell or a row/column ruler label.
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
      { label: "Sum column", run: run((info) => sumColumnAction(view, info)) },
      { label: "Sort A → Z", run: run((info) => sortColumnAction(view, info, "asc")) },
      { label: "Sort Z → A", run: run((info) => sortColumnAction(view, info, "desc")) },
      { label: alignLabel("left", "Align left"), run: run((info) => setAlignmentAction(view, info, "left")) },
      { label: alignLabel("center", "Align center"), run: run((info) => setAlignmentAction(view, info, "center")) },
      { label: alignLabel("right", "Align right"), run: run((info) => setAlignmentAction(view, info, "right")) },
      { label: "Delete column", danger: true, disabled: colCount <= 1, run: run((info) => removeColumnAction(view, info)) },
      { separator: true },
      { heading: "Table" },
      { label: "Edit as Markdown", hint: formatShortcut("↵", { shift: true }), run: () => editSource(el) },
      { label: "Copy as CSV", run: run((info) => copyCSVAction(info)) },
      { label: "Copy as JSON", run: run((info) => copyJSONAction(info)) },
      { label: "Delete table", confirmLabel: "Click again to delete", danger: true, run: run((info) => removeTableAction(view, info)) },
    ];
  };

  const scroll = wrapper.querySelector<HTMLElement>(".cm-table-preview-scroll");
  const activeCell = () => {
    const active = wrapper.ownerDocument.activeElement;
    return active instanceof HTMLElement && wrapper.contains(active) && active.hasAttribute(CELL_ATTR) ? active : null;
  };
  const rulers = scroll
    ? createTableRulers(scroll, {
        menuFor,
        focusCell: (el) => {
          if (el.ownerDocument.activeElement !== el) focusCellElement(el);
        },
        // Clicking a letter keeps the current row; clicking a number keeps
        // the current column (A1 rows: index 0 = header = row 1).
        cellFor: (row, col) => {
          const current = activeCell();
          const [curRow, curCol] = (current?.getAttribute(CELL_ATTR) ?? "1:0").split(":").map(Number);
          return cellAt(row === null ? curRow : row + 1, col === null ? curCol : col)
            ?? cellAt(1, col === null ? curCol : col);
        },
      })
    : null;
  if (rulers) rulersByWrapper.set(wrapper, rulers);

  wrapper.addEventListener("contextmenu", (event) => {
    const el = cellOf(event.target);
    if (!el) return;
    event.preventDefault();
    if (el.ownerDocument.activeElement !== el) focusCellElement(el);
    showTableMenu({ x: event.clientX, y: event.clientY, doc: el.ownerDocument }, menuFor(el), "Table options");
  });


  wrapper.addEventListener("focusin", (event) => {
    const el = cellOf(event.target);
    if (!el) return;
    el.classList.add("cm-table-cell-editing");
    el.classList.remove("cm-table-formula", "is-error");
    delete el.dataset.display;
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
    const cell = offsetOf(el);
    renderCell(el, cell?.text ?? el.dataset.raw ?? "", cell && matchByWrapper.get(wrapper)?.computed.get(cellKey(cell)));
    const next = (event as FocusEvent).relatedTarget;
    if (!(next instanceof Node && wrapper.contains(next))) {
      closeTableMenu();
      rulers?.update(null);
    }
  });

  wrapper.addEventListener("input", (event) => {
    const el = cellOf(event.target);
    if (el) commitCell(el);
    refreshHandles(wrapper);
  });

  wrapper.addEventListener("beforeinput", (event) => {
    const type = (event as InputEvent).inputType;
    if (type === "historyUndo" || type === "historyRedo") {
      // Native undo (Edit menu, shake-to-undo) would only rewind this cell's
      // DOM text; route it to the editor's history like Ctrl/Cmd+Z.
      event.preventDefault();
      if (type === "historyUndo") undo(view);
      else redo(view);
      if (!focusTableCellAt(view, view.state.selection.main.head)) view.focus();
      return;
    }
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
      if (mod && event.shiftKey) {
        editSource(el);
      } else if (mod) {
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
    // Select all stays inside the cell; otherwise CodeMirror's keymap
    // grabs it and selects the whole document.
    if (mod && !event.altKey && !event.shiftKey && key === "a") {
      handled();
      const selection = el.ownerDocument.getSelection();
      if (!selection) return;
      const range = el.ownerDocument.createRange();
      range.selectNodeContents(el);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }

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
