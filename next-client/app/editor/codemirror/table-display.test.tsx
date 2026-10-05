import { act, fireEvent, waitFor } from "@testing-library/react";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { history } from "@codemirror/commands";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import { parseTable } from "../utils/tableParser";
import {
  collectTableDisplayMatches,
  tableDisplayExtension,
} from "./table-display";

const views: EditorView[] = [];

function makeView(doc: string, cursor = 0) {
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  let view!: EditorView;
  act(() => {
    view = new EditorView({
      parent,
      state: EditorState.create({
        doc,
        selection: EditorSelection.cursor(cursor),
        extensions: [
          history(),
          markdown({ base: markdownLanguage }),
          tableDisplayExtension,
        ],
      }),
    });
  });
  views.push(view);
  return view;
}

afterEach(async () => {
  await act(async () => {
    for (const view of views.splice(0)) view.destroy();
    await Promise.resolve();
  });
  document.body.replaceChildren();
});

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function cellAt(view: EditorView, key: string) {
  return waitFor(() => {
    const cell = view.dom.querySelector<HTMLElement>(`[data-source-cell="${key}"]`);
    expect(cell).not.toBeNull();
    return cell!;
  });
}

function tableSource(view: EditorView) {
  const [match] = collectTableDisplayMatches(view.state);
  return match ? parseTable(match.source) : null;
}

describe("tableDisplayExtension", () => {
  it("renders tables as an editable grid with inline Markdown", async () => {
    const doc = [
      "Intro",
      "",
      "| Name | Details |",
      "| --- | --- |",
      "| Ada | **Ready** with [notes](https://example.com) |",
    ].join("\n");
    const view = makeView(doc);

    await waitFor(() => {
      expect(view.dom.querySelectorAll(".cm-table-preview")).toHaveLength(1);
    });
    const table = view.dom.querySelector(".cm-table-preview table");
    expect(table).toHaveTextContent("Ada");
    expect(table?.querySelector("strong")).toHaveTextContent("Ready");
    expect(table?.querySelector("a")).toHaveAttribute("href", "https://example.com");
    expect(await cellAt(view, "2:0")).toHaveAttribute("contenteditable", "true");
  });

  it("never reveals the pipe source, even with the selection inside the table", async () => {
    const doc = "Intro\n\n| A | B |\n| --- | --- |\n| 1 | 2 |";
    const view = makeView(doc);
    await cellAt(view, "1:0");

    await act(async () => {
      view.dispatch({ selection: EditorSelection.cursor(doc.indexOf("A")) });
      await Promise.resolve();
    });

    expect(view.dom.querySelector(".cm-table-preview")).not.toBeNull();
    expect(view.contentDOM).not.toHaveTextContent("| A | B |");
  });

  it("writes cell edits straight back into the Markdown source", async () => {
    const doc = "Intro\n\n| Item | Status |\n| --- | --- |\n| Draft | Ready |";
    const view = makeView(doc);
    const cell = await cellAt(view, "2:1");

    act(() => cell.focus());
    await flush();
    act(() => {
      cell.textContent = "Shipped";
      fireEvent.input(cell);
    });

    expect(view.state.doc.toString()).toContain("| Draft | Shipped |");
    expect(view.dom.querySelector('[data-source-cell="2:1"]')).toBe(cell);
  });

  it("stores typed pipes escaped so they can't split the cell", async () => {
    const doc = "| A | B |\n| --- | --- |\n| 1 | 2 |";
    const view = makeView(doc);
    const cell = await cellAt(view, "2:0");

    act(() => cell.focus());
    await flush();
    act(() => {
      cell.textContent = "x|y";
      fireEvent.input(cell);
    });

    expect(view.state.doc.toString()).toContain("x\\|y");
    expect(tableSource(view)?.rows[0]).toEqual(["x\\|y", "2"]);
  });

  it("adds a row when tabbing out of the last cell", async () => {
    const doc = "| A | B |\n| --- | --- |\n| 1 | 2 |";
    const view = makeView(doc);
    const last = await cellAt(view, "2:1");

    act(() => last.focus());
    await flush();
    act(() => {
      fireEvent.keyDown(last, { key: "Tab" });
    });
    await flush();

    expect(tableSource(view)?.rows).toHaveLength(2);
    expect(document.activeElement?.getAttribute("data-source-cell")).toBe("3:0");
  });

  it("moves focus down a column on Enter", async () => {
    const doc = "| A | B |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |";
    const view = makeView(doc);
    const cell = await cellAt(view, "2:1");

    act(() => cell.focus());
    act(() => {
      fireEvent.keyDown(cell, { key: "Enter" });
    });

    expect(document.activeElement?.getAttribute("data-source-cell")).toBe("3:1");
    expect(view.state.doc.toString()).toBe(doc);
  });

  it("moves a row with Alt+ArrowDown as a single undo step", async () => {
    const doc = "| A |\n| --- |\n| 1 |\n| 2 |";
    const view = makeView(doc);
    const cell = await cellAt(view, "2:0");

    act(() => cell.focus());
    await flush();
    act(() => {
      fireEvent.keyDown(cell, { key: "ArrowDown", altKey: true });
    });

    expect(tableSource(view)?.rows).toEqual([["2"], ["1"]]);
    const moved = document.activeElement as HTMLElement;
    expect(moved.getAttribute("data-source-cell")).toBe("3:0");

    act(() => {
      fireEvent.keyDown(moved, { key: "z", ctrlKey: true });
    });
    expect(tableSource(view)?.rows).toEqual([["1"], ["2"]]);
  });

  it("keeps table actions off the cells: right-click menu and a column tab above the table", async () => {
    const doc = "| A | B |\n| --- | --- |\n| 1 | 2 |";
    const view = makeView(doc);
    const cell = await cellAt(view, "2:0");

    // Nothing is drawn inside the grid.
    expect(view.dom.querySelector("table .cm-table-column-tab")).toBeNull();

    act(() => {
      fireEvent.contextMenu(cell, { clientX: 10, clientY: 10 });
    });
    const menu = document.querySelector(".cm-table-menu");
    expect(menu).toHaveTextContent("Insert row above");
    expect(menu).toHaveTextContent("Insert column right");
    expect(menu).toHaveTextContent("Copy as CSV");

    const insertRight = [...menu!.querySelectorAll("button")].find((b) => b.textContent === "Insert column right")!;
    act(() => {
      fireEvent.click(insertRight);
    });
    expect(tableSource(view)?.headers).toEqual(["A", "", "B"]);
    expect(document.querySelector(".cm-table-menu")).toBeNull();
  });

  it("shows row numbers and column letters while editing, and they open the menu", async () => {
    const doc = "| A | B |\n| --- | --- |\n| 1 | 2 |";
    const view = makeView(doc);
    const cell = await cellAt(view, "2:1");

    act(() => cell.focus());
    await waitFor(() => {
      expect(view.dom.querySelector<HTMLElement>(".cm-table-rulers")?.hidden).toBe(false);
    });
    const letters = [...view.dom.querySelectorAll<HTMLElement>(".cm-table-ruler-col")].filter((el) => !el.hidden);
    const numbers = [...view.dom.querySelectorAll<HTMLElement>(".cm-table-ruler-row")].filter((el) => !el.hidden);
    expect(letters.map((el) => el.textContent)).toEqual(["A", "B"]);
    expect(numbers.map((el) => el.textContent)).toEqual(["1", "2"]);
    expect(letters[1]).toHaveClass("is-active");
    expect(numbers[1]).toHaveClass("is-active");

    act(() => {
      fireEvent.click(letters[0]);
    });
    expect(document.activeElement?.getAttribute("data-source-cell")).toBe("2:0");
    expect(document.querySelector(".cm-table-menu")).toHaveTextContent("Insert column left");
  });

  it("undoes Sum column from inside a cell in one step", async () => {
    const doc = "| Item | Cost |\n| --- | --- |\n| A | 2 |\n| B | 3 |";
    const view = makeView(doc);
    const cell = await cellAt(view, "3:1");

    act(() => cell.focus());
    await flush();
    act(() => {
      fireEvent.contextMenu(cell, { clientX: 5, clientY: 5 });
    });
    const sum = [...document.querySelectorAll(".cm-table-menu button")].find((b) => b.textContent === "Sum column")!;
    act(() => {
      fireEvent.click(sum);
    });
    expect(view.state.doc.toString()).toContain("=SUM(B2:B3)");

    const focused = document.activeElement as HTMLElement;
    act(() => {
      fireEvent.keyDown(focused, { key: "z", ctrlKey: true });
    });
    expect(view.state.doc.toString()).toBe(doc);
  });

  it("shows formula results, and the raw formula while the cell is focused", async () => {
    const doc = "| Item | Cost |\n| --- | --- |\n| A | 2 |\n| B | 3 |\n| Total | =SUM(B2:B3) |";
    const view = makeView(doc);
    const total = await cellAt(view, "4:1");

    expect(total).toHaveTextContent("5");
    expect(total).toHaveClass("cm-table-formula");
    expect(total).toHaveAttribute("title", "=SUM(B2:B3)");

    act(() => total.focus());
    expect(total).toHaveTextContent("=SUM(B2:B3)");

    // Editing an input re-computes the (unfocused) formula cell.
    const input = await cellAt(view, "2:1");
    act(() => input.focus());
    await flush();
    act(() => {
      input.textContent = "10";
      fireEvent.input(input);
    });
    expect(view.dom.querySelector('[data-source-cell="4:1"]')).toHaveTextContent("13");
  });

  it("resolves references to another table by its heading", async () => {
    const doc = [
      "## Income",
      "",
      "| Source | Amount |",
      "| --- | --- |",
      "| Job | 100 |",
      "",
      "## Summary",
      "",
      "| Label | Value |",
      "| --- | --- |",
      "| Income | =SUM(Income!B) |",
    ].join("\n");
    const view = makeView(doc);
    await waitFor(() => {
      expect(view.dom.querySelectorAll(".cm-table-formula")).toHaveLength(1);
    });
    expect(view.dom.querySelector(".cm-table-formula")).toHaveTextContent("100");
  });

  it("renders multiple tables but leaves malformed and fenced pipe blocks raw", async () => {
    const doc = [
      "Intro",
      "",
      "| A |",
      "| --- |",
      "| 1 |",
      "",
      "```md",
      "| Hidden |",
      "| --- |",
      "```",
      "",
      "| malformed |",
      "| data |",
      "",
      "| B |",
      "| --- |",
      "| 2 |",
    ].join("\n");
    const view = makeView(doc);

    expect(collectTableDisplayMatches(view.state)).toHaveLength(2);
    await waitFor(() => {
      expect(view.dom.querySelectorAll(".cm-table-preview")).toHaveLength(2);
    });
    expect(view.contentDOM).toHaveTextContent("| Hidden |");
    expect(view.contentDOM).toHaveTextContent("| malformed |");
  });

  it("maps cells in valid tables without outer pipes", async () => {
    const doc = "Intro\n\nA | B\n--- | ---\nOne | Two";
    const view = makeView(doc);

    const firstCell = await cellAt(view, "2:0");
    expect(firstCell).toHaveTextContent("One");

    act(() => firstCell.focus());
    await flush();
    // First edit normalises the source to outer-pipe form.
    expect(view.state.doc.toString()).toContain("| One");
  });

  it("shows a broken table's pipe source to fix by hand, and the grid again once the caret leaves", async () => {
    // A line typed under a table without a blank line becomes a row.
    const doc = "| A | B |\n| --- | --- |\n| 1 | 2 |\nstray line\n\nAfter";
    const view = makeView(doc, doc.length);
    const cell = await cellAt(view, "2:0");

    act(() => {
      fireEvent.contextMenu(cell, { clientX: 10, clientY: 10 });
    });
    const editSource = [...document.querySelectorAll(".cm-table-menu button")]
      .find((b) => b.textContent?.startsWith("Edit as Markdown"))!;
    act(() => {
      fireEvent.click(editSource);
    });
    await flush();

    expect(view.dom.querySelector(".cm-table-preview")).toBeNull();
    expect(view.contentDOM).toHaveTextContent("stray line");
    expect(view.state.selection.main.head).toBe(doc.indexOf("1 |"));

    // Fixing it: a blank line separates the stray line from the table.
    const strayFrom = view.state.doc.toString().indexOf("stray line");
    act(() => {
      view.dispatch({ changes: { from: strayFrom, insert: "\n" } });
    });
    expect(view.dom.querySelector(".cm-table-preview")).toBeNull();

    act(() => {
      view.dispatch({ selection: EditorSelection.cursor(view.state.doc.length) });
    });
    await waitFor(() => expect(view.dom.querySelector(".cm-table-preview")).not.toBeNull());
    expect(tableSource(view)?.rows).toEqual([["1", "2"]]);
  });

  it("opens the pipe source with Ctrl/Cmd+Shift+Enter from a cell", async () => {
    const doc = "| A | B |\n| --- | --- |\n| 1 | 2 |";
    const view = makeView(doc);
    const cell = await cellAt(view, "2:1");

    act(() => {
      fireEvent.keyDown(cell, { key: "Enter", ctrlKey: true, shiftKey: true });
    });
    await flush();

    expect(view.dom.querySelector(".cm-table-preview")).toBeNull();
    expect(view.state.doc.toString()).toBe(doc);
  });
});
