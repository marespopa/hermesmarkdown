import type { Node as ProseNode } from "@milkdown/kit/prose/model";
import type { EditorView } from "@milkdown/kit/prose/view";
import { TextSelection } from "@milkdown/kit/prose/state";
import {
  addRowAfter,
  addColumnAfter,
  deleteRow,
  deleteColumn,
  deleteTable,
  TableMap,
} from "@milkdown/kit/prose/tables";
import { sortRowIndices, type SortDirection } from "../utils/tableSorter";

// Thin wrappers around prosemirror-tables' own commands — they operate on
// whatever cell the current selection is in, which is exactly the cell
// TableCalloutPlugin last reported, so no extra positioning is needed here.
export function addRowAction(view: EditorView) {
  addRowAfter(view.state, view.dispatch);
  view.focus();
}

export function removeRowAction(view: EditorView) {
  deleteRow(view.state, view.dispatch);
  view.focus();
}

export function addColumnAction(view: EditorView) {
  addColumnAfter(view.state, view.dispatch);
  view.focus();
}

export function removeColumnAction(view: EditorView) {
  deleteColumn(view.state, view.dispatch);
  view.focus();
}

export function removeTableAction(view: EditorView) {
  deleteTable(view.state, view.dispatch);
  view.focus();
}

function cellText(row: ProseNode, colIdx: number): string | undefined {
  if (colIdx >= row.childCount) return undefined;
  return row.child(colIdx).textContent;
}

// Reorders a table's body rows (everything after table_header_row, always
// child 0 per the gfm schema) by the text content of the given column.
// Rebuilds the whole table node in one transaction — simpler and safer than
// trying to move prosemirror-tables rows one at a time — then parks the
// cursor at the top of the table since old cell positions don't survive
// the rebuild.
export function sortColumnAction(
  view: EditorView,
  tablePos: number,
  colIdx: number,
  direction: Exclude<SortDirection, "none">,
) {
  const { state } = view;
  const table = state.doc.nodeAt(tablePos);
  if (!table || table.type.name !== "table" || table.childCount < 2) return;

  const headerRow = table.child(0);
  const bodyRows: ProseNode[] = [];
  for (let i = 1; i < table.childCount; i++) bodyRows.push(table.child(i));

  const order = sortRowIndices(bodyRows, cellText, colIdx, direction);
  const reordered = order.map((i) => bodyRows[i]);
  if (reordered.every((row, i) => row === bodyRows[i])) return;

  const newTable = table.type.create(table.attrs, [headerRow, ...reordered]);
  const tr = state.tr.replaceWith(tablePos, tablePos + table.nodeSize, newTable);
  tr.setSelection(TextSelection.near(tr.doc.resolve(tablePos + 1)));
  view.dispatch(tr);
  view.focus();
}

export function copyCSVAction(view: EditorView, tablePos: number) {
  const table = view.state.doc.nodeAt(tablePos);
  if (!table || table.type.name !== "table") return;
  const rows: string[] = [];
  for (let r = 0; r < table.childCount; r++) {
    const row = table.child(r);
    const cells: string[] = [];
    for (let c = 0; c < row.childCount; c++) {
      const text = row.child(c).textContent;
      cells.push(/[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text);
    }
    rows.push(cells.join(","));
  }
  navigator.clipboard.writeText(rows.join("\n")).catch(() => {});
}

const ALIGN_CYCLE = ["left", "center", "right"] as const;
type Alignment = (typeof ALIGN_CYCLE)[number];

// Alignment is stored per-cell in this schema (parseMarkdown copies the
// single markdown alignment-row value onto every cell in the column), but
// it's conceptually a column-level property — cycling it updates every
// cell in the column (header and data rows alike) in one transaction, not
// just the cell the cursor happens to be in.
export function cycleAlignAction(view: EditorView, tablePos: number, colIdx: number) {
  const { state } = view;
  const table = state.doc.nodeAt(tablePos);
  if (!table || table.type.name !== "table") return;

  const headerCell = table.child(0).maybeChild(colIdx);
  const current = (headerCell?.attrs.alignment as Alignment) || "left";
  const next = ALIGN_CYCLE[(ALIGN_CYCLE.indexOf(current) + 1) % ALIGN_CYCLE.length];

  const map = TableMap.get(table);
  let tr = state.tr;
  for (let row = 0; row < map.height; row++) {
    const cellPos = map.positionAt(row, colIdx, table);
    const cellNode = table.nodeAt(cellPos);
    if (!cellNode) continue;
    tr = tr.setNodeMarkup(tr.mapping.map(tablePos + 1 + cellPos), undefined, { ...cellNode.attrs, alignment: next });
  }
  view.dispatch(tr);
  view.focus();
}
