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
  findTableInState,
  insertRowAboveAction,
  moveRowAction,
  moveColumnAction,
  pasteGridAction,
  tableMoveRowCommand,
  sumColumnAction,
  realignExitedTable,
} from "./table-commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { undo, history } from "@codemirror/commands";

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

describe("table enhancements", () => {
  function infoAt(view: EditorView) {
    return findTableAtPos(view.state.doc.toString(), view.state.selection.main.head)!;
  }

  it("Tab in the last cell appends a row and lands in its first cell", () => {
    const view = makeView(TABLE, TABLE.length - 2); // inside "4"
    expect(tableTabCommand(view)).toBe(true);
    expect(parseCurrentTable(view)?.rows.length).toBe(3);
    expect(infoAt(view).lineIdx).toBe(4);
    expect(infoAt(view).cursorCol).toBe(0);
  });

  it("Tab in the last cell of a table still being drafted falls through", () => {
    const view = makeView("| A | B |", 6);
    expect(tableTabCommand(view)).toBe(false);
  });

  it("leaves typed pipes plain while drafting or when appending at a row's end", () => {
    const drafting = makeView("| A |", 2);
    expect(tablePipeEscapeCommand(drafting)).toBe(false);
    const rowEnd = makeView(TABLE, "| A | B |".length);
    expect(tablePipeEscapeCommand(rowEnd)).toBe(false);
  });

  it("ignores pipe lines inside fenced code blocks", () => {
    const doc = "```\n| A | B |\n| - | - |\n```";
    const state = EditorState.create({ doc, extensions: [markdown({ base: markdownLanguage })] });
    expect(findTableInState(state, doc.indexOf("A"))).toBeNull();
  });

  it("moves rows and columns, and each move is one undo step", () => {
    const state = EditorState.create({
      doc: TABLE,
      selection: EditorSelection.cursor(TABLE.indexOf("| 1 ") + 2),
      extensions: [history()],
    });
    const view = new EditorView({ state });
    expect(moveRowAction(view, infoAt(view), 1)).toBe(true);
    expect(parseCurrentTable(view)?.rows).toEqual([["3", "4"], ["1", "2"]]);
    expect(moveColumnAction(view, infoAt(view), 1)).toBe(true);
    expect(parseCurrentTable(view)?.headers).toEqual(["B", "A"]);
    undo(view);
    expect(parseCurrentTable(view)?.headers).toEqual(["A", "B"]);
    undo(view);
    expect(parseCurrentTable(view)?.rows).toEqual([["1", "2"], ["3", "4"]]);
  });

  it("Alt+Arrow row moves are consumed inside a table even at the edge", () => {
    const view = makeView(TABLE, 2); // header row can't move
    expect(tableMoveRowCommand(view, -1)).toBe(true);
    expect(view.state.doc.toString()).toBe(TABLE);
  });

  it("inserts a row above the caret's row", () => {
    const view = makeView(TABLE, TABLE.indexOf("| 3 ") + 2);
    insertRowAboveAction(view, infoAt(view));
    expect(parseCurrentTable(view)?.rows).toEqual([["1", "2"], ["", ""], ["3", "4"]]);
  });

  it("pastes a grid from the caret's cell, growing the table", () => {
    const view = makeView(TABLE, TABLE.indexOf("| 4 ") + 2);
    pasteGridAction(view, infoAt(view), [["x", "y"], ["z", "w|v"]]);
    const data = parseCurrentTable(view)!;
    expect(data.headers).toHaveLength(3);
    expect(data.rows).toEqual([["1", "2", ""], ["3", "x", "y"], ["", "z", "w\\|v"]]);
  });

  it("Sum column appends a totals row, then reuses it for other columns", () => {
    const view = makeView(TABLE, TABLE.indexOf("| 1 ") + 2);
    sumColumnAction(view, infoAt(view));
    expect(parseCurrentTable(view)?.rows[2]).toEqual(["=SUM(A2:A3)", ""]);

    const cursorInB = view.state.doc.toString().indexOf("| 2 ") + 2;
    view.dispatch({ selection: EditorSelection.cursor(cursorInB) });
    sumColumnAction(view, infoAt(view));
    const rows = parseCurrentTable(view)!.rows;
    expect(rows).toHaveLength(3);
    expect(rows[2]).toEqual(["=SUM(A2:A3)", "=SUM(B2:B3)"]);
  });

  it("Sum column never treats a data row with a per-row formula as the totals row", () => {
    const doc = ["| Qty | Price | Line |", "| --- | --- | --- |", "| 2 | 3 | =A2*B2 |", "| 1 | 5 | =A3*B3 |"].join("\n");
    const view = makeView(doc, doc.indexOf("=A3*B3") + 1);
    sumColumnAction(view, infoAt(view));
    const rows = parseCurrentTable(view)!.rows;
    expect(rows).toHaveLength(3);
    expect(rows[1][2]).toBe("=A3*B3");
    expect(rows[2][2]).toBe("=SUM(C2:C3)");
  });

  it("adding a row at the end goes above the totals row and grows its ranges", () => {
    const doc = ["| A |", "| --- |", "| 1 |", "| 2 |", "| =SUM(A2:A3) |"].join("\n");
    const view = makeView(doc, doc.indexOf("=SUM") + 1); // Tab out of the last cell
    expect(tableTabCommand(view)).toBe(true);
    const rows = parseCurrentTable(view)!.rows;
    expect(rows).toEqual([["1"], ["2"], [""], ["=SUM(A2:A4)"]]);
  });

  it("realigning an exited table only touches padding, so earlier edits stay undoable", () => {
    const doc = "| A | B |\n| --- | --- |\n| 1 | 2 |";
    const state = EditorState.create({ doc, extensions: [history()] });
    const view = new EditorView({ state });
    const pos = doc.indexOf("1");
    view.dispatch({ changes: { from: pos, to: pos + 1, insert: "a much longer value" } });
    realignExitedTable(view, findTableAtPos(view.state.doc.toString(), 0)!);
    expect(view.state.doc.line(1).text).not.toBe("| A | B |"); // padded
    undo(view);
    expect(parseCurrentTable(view)?.rows[0]).toEqual(["1", "2"]);
  });
});
