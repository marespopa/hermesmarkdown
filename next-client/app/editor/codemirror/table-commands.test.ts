import { describe, it, expect } from "vitest";
import { EditorView } from "@codemirror/view";
import { EditorState, EditorSelection } from "@codemirror/state";
import { findTableAtPos } from "../utils/table-detection";
import { parseTable, extractTableSource } from "../utils/tableParser";
import {
  tableTabCommand,
  tableShiftTabCommand,
  tablePipeEscapeCommand,
  tableEnterCommand,
  tableArrowVerticalCommand,
  addRowAction,
  removeRowAction,
  addColumnAction,
  removeColumnAction,
  sortColumnAction,
  cycleAlignAction,
  removeTableAction,
} from "./table-commands";

const TABLE = ["| A | B |", "| --- | --- |", "| 1 | 2 |", "| 3 | 4 |"].join("\n");

function makeView(doc: string, cursor: number) {
  const state = EditorState.create({ doc, selection: EditorSelection.cursor(cursor) });
  return new EditorView({ state });
}

function parseCurrentTable(view: EditorView) {
  const info = findTableAtPos(view.state.doc.toString(), view.state.selection.main.head);
  if (!info) return null;
  return parseTable(extractTableSource(info.lines, info.tableStart, info.tableEnd));
}

describe("tableTabCommand / tableShiftTabCommand", () => {
  it("moves from the first header cell to the second on Tab", () => {
    const view = makeView(TABLE, 2); // inside "A"
    const applied = tableTabCommand(view);
    expect(applied).toBe(true);
    const info = findTableAtPos(view.state.doc.toString(), view.state.selection.main.head);
    expect(info?.cursorCol).toBe(1);
    expect(info?.lineIdx).toBe(0);
  });

  it("moves to the first cell of the next row when tabbing past the last column", () => {
    const view = makeView(TABLE, TABLE.indexOf("| 1 ") + 2); // inside "1"
    tableTabCommand(view); // -> "2"
    tableTabCommand(view); // -> next row, col 0 ("3")
    const info = findTableAtPos(view.state.doc.toString(), view.state.selection.main.head);
    expect(info?.cursorCol).toBe(0);
    expect(info?.lineIdx).toBe(3);
  });

  it("Shift-Tab moves backward to the previous cell", () => {
    const view = makeView(TABLE, TABLE.indexOf("| 2 |") + 2); // inside "2"
    const applied = tableShiftTabCommand(view);
    expect(applied).toBe(true);
    const info = findTableAtPos(view.state.doc.toString(), view.state.selection.main.head);
    expect(info?.cursorCol).toBe(0);
  });

  it("returns false outside a table", () => {
    const view = makeView("plain text", 3);
    expect(tableTabCommand(view)).toBe(false);
  });
});

describe("tablePipeEscapeCommand", () => {
  it("inserts an escaped pipe inside a table cell", () => {
    const view = makeView(TABLE, 2);
    const applied = tablePipeEscapeCommand(view);
    expect(applied).toBe(true);
    expect(view.state.doc.toString()).toContain("\\|");
  });

  it("returns false outside a table", () => {
    const view = makeView("plain text", 3);
    expect(tablePipeEscapeCommand(view)).toBe(false);
  });
});

describe("tableEnterCommand", () => {
  it("adds a new row when Enter is pressed at the end of the last row", () => {
    const lastLine = "| 3 | 4 |";
    const pos = TABLE.length; // end of doc, end of last row
    const view = makeView(TABLE, pos);
    const applied = tableEnterCommand(view);
    expect(applied).toBe(true);
    const data = parseCurrentTable(view);
    expect(data?.rows.length).toBe(3);
  });

  it("does nothing on the separator row", () => {
    const sepPos = TABLE.indexOf("| --- | --- |") + 2;
    const view = makeView(TABLE, sepPos);
    expect(tableEnterCommand(view)).toBe(false);
  });
});

describe("tableArrowVerticalCommand", () => {
  it("moves down a row, skipping the separator", () => {
    const headerCellPos = 2; // inside "A"
    const view = makeView(TABLE, headerCellPos);
    const applied = tableArrowVerticalCommand(view, 1);
    expect(applied).toBe(true);
    const info = findTableAtPos(view.state.doc.toString(), view.state.selection.main.head);
    expect(info?.lineIdx).toBe(2); // first data row, not the separator
  });

  it("returns false at the top row moving up", () => {
    const view = makeView(TABLE, 2);
    expect(tableArrowVerticalCommand(view, -1)).toBe(false);
  });
});

describe("table toolbar actions", () => {
  it("addRowAction adds a data row", () => {
    const view = makeView(TABLE, TABLE.indexOf("| 1 ") + 2);
    addRowAction(view, findTableAtPos(view.state.doc.toString(), view.state.selection.main.head)!);
    const data = parseCurrentTable(view);
    expect(data?.rows.length).toBe(3);
  });

  it("removeRowAction removes the current data row", () => {
    const view = makeView(TABLE, TABLE.indexOf("| 1 ") + 2);
    const info = findTableAtPos(view.state.doc.toString(), view.state.selection.main.head)!;
    removeRowAction(view, info);
    const data = parseCurrentTable(view);
    expect(data?.rows.length).toBe(1);
    expect(data?.rows[0]).toEqual(["3", "4"]);
  });

  it("addColumnAction adds a column after the cursor's column", () => {
    const view = makeView(TABLE, 2); // col 0
    const info = findTableAtPos(view.state.doc.toString(), view.state.selection.main.head)!;
    addColumnAction(view, info);
    const data = parseCurrentTable(view);
    expect(data?.headers.length).toBe(3);
  });

  it("removeColumnAction removes the cursor's column", () => {
    const view = makeView(TABLE, 2); // col 0 ("A")
    const info = findTableAtPos(view.state.doc.toString(), view.state.selection.main.head)!;
    removeColumnAction(view, info);
    const data = parseCurrentTable(view);
    expect(data?.headers).toEqual(["B"]);
  });

  it("sortColumnAction sorts data rows by the cursor's column, descending", () => {
    const view = makeView(TABLE, 2);
    const info = findTableAtPos(view.state.doc.toString(), view.state.selection.main.head)!;
    sortColumnAction(view, info, "desc");
    const data = parseCurrentTable(view);
    expect(data?.rows.map((r) => r[0])).toEqual(["3", "1"]);
  });

  it("cycleAlignAction changes the current column's separator markup", () => {
    // parseTable's Alignment type can't distinguish "none" (plain "---")
    // from "left" (also a plain "---" with no colon) — both round-trip to
    // "left" — so assert on the actual separator text instead, which is
    // what the command really mutates.
    const view = makeView(TABLE, 2);
    const info = findTableAtPos(view.state.doc.toString(), view.state.selection.main.head)!;
    cycleAlignAction(view, info);
    const newInfo = findTableAtPos(view.state.doc.toString(), view.state.selection.main.head)!;
    const separatorLine = newInfo.lines[newInfo.tableStart + 1];
    expect(separatorLine).not.toBe("| --- | --- |");
    expect(separatorLine).toContain(":");
  });

  it("removeTableAction deletes the entire table block", () => {
    const doc = `before\n${TABLE}\nafter`;
    const pos = doc.indexOf(TABLE) + 2;
    const view = makeView(doc, pos);
    const info = findTableAtPos(view.state.doc.toString(), view.state.selection.main.head)!;
    removeTableAction(view, info);
    expect(view.state.doc.toString()).toBe("before\nafter");
  });
});
