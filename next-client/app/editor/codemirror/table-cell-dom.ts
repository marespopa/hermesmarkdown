import { isMacPlatform } from "@/app/utils/platform";
import { isFormulaCell } from "../utils/formula-engine";
import { renderInlineMarkdown } from "../utils/inline-markdown";
import type { CellOffset } from "../utils/table-cell-offsets";
import type { TableDisplayMatch } from "./table-display";
import { CELL_ATTR, cellKey, placeCaret, type TableWidgetHandle } from "./table-focus";
import type { ComputedCell } from "./table-formulas";
import type { TableRulers } from "./table-handles";

// DOM helpers for the inline table widget: cell rendering, building and
// syncing the <table>, caret offsets, and per-wrapper bookkeeping.
export const toDisplay = (raw: string) => raw.replace(/\\\|/g, "|");
export const toRaw = (display: string) =>
  display.replace(/\u00a0/g, " ").replace(/\s*\n\s*/g, " ").trim().replace(/\\?\|/g, "\\|");

// Unfocused cells show rendered Markdown — or, for a formula, its computed
// result (the raw formula stays available as a tooltip and on focus).
export function renderCell(el: HTMLElement, raw: string, computed?: ComputedCell) {
  el.dataset.raw = raw;
  const formula = computed && isFormulaCell(raw) ? computed : null;
  el.classList.toggle("cm-table-formula", !!formula);
  el.classList.toggle("is-error", !!formula?.isError);
  if (formula) {
    el.dataset.display = formula.display;
    el.title = raw;
    el.textContent = formula.display;
  } else {
    delete el.dataset.display;
    el.removeAttribute("title");
    el.innerHTML = renderInlineMarkdown(raw);
  }
}

// The latest match each rendered grid reflects (for computed results).
export const matchByWrapper = new WeakMap<HTMLElement, TableDisplayMatch>();

export const shapeOf = (cells: CellOffset[]) => cells.map(cellKey).join(",");

export const rulersByWrapper = new WeakMap<HTMLElement, TableRulers>();

// Re-positions a table's row/column rulers on the next frame (after layout has
// caught up with typing, which can change column widths).
export function refreshHandles(wrapper: HTMLElement) {
  const handles = rulersByWrapper.get(wrapper);
  if (!handles) return;
  const nextFrame = globalThis.requestAnimationFrame ?? ((fn: () => void) => setTimeout(fn, 16));
  nextFrame(() => {
    const active = wrapper.ownerDocument.activeElement;
    handles.update(active instanceof HTMLElement && wrapper.contains(active) && active.hasAttribute(CELL_ATTR) ? active : null);
  });
}

export const altHint = (key: string) => (isMacPlatform() ? `⌥${key}` : `Alt+${key}`);

export function handleFor(match: TableDisplayMatch): TableWidgetHandle {
  return { from: match.from, to: match.to, source: match.source, cells: match.cells };
}

export function buildTable(match: TableDisplayMatch): HTMLTableElement {
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
        renderCell(el, cell.text, match.computed.get(cellKey(cell)));
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
export function syncTable(dom: HTMLElement, match: TableDisplayMatch) {
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
    } else {
      const computed = match.computed.get(cellKey(cell));
      if (el.dataset.raw !== cell.text || el.dataset.display !== computed?.display) {
        renderCell(el, cell.text, computed);
      }
    }
  }
}

export function caretOffsetIn(el: HTMLElement): number | null {
  const selection = el.ownerDocument.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!range.collapsed || !el.contains(range.startContainer)) return null;
  const before = el.ownerDocument.createRange();
  before.selectNodeContents(el);
  before.setEnd(range.startContainer, range.startOffset);
  return before.toString().length;
}

export function selectionOffsetsIn(el: HTMLElement): { start: number; end: number } | null {
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

export function setCaretOffset(el: HTMLElement, offset: number) {
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
