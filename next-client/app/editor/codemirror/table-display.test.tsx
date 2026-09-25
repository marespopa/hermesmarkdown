import { act, fireEvent, waitFor } from "@testing-library/react";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
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
          markdown({ base: markdownLanguage }),
          tableDisplayExtension,
        ],
      }),
    });
  });
  views.push(view);
  return view;
}

afterEach(() => {
  act(() => {
    for (const view of views.splice(0)) view.destroy();
  });
  document.body.replaceChildren();
});

describe("tableDisplayExtension", () => {
  it("renders valid inactive tables with inline Markdown", async () => {
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
    expect(table).not.toBeNull();
    expect(table).toHaveTextContent("Ada");
    expect(table?.querySelector("strong")).toHaveTextContent("Ready");
    expect(table?.querySelector("a")).toHaveAttribute("href", "https://example.com");
  });

  it("reveals raw source whenever the selection enters the table", async () => {
    const doc = "Intro\n\n| A | B |\n| --- | --- |\n| 1 | 2 |";
    const view = makeView(doc);

    await waitFor(() => {
      expect(view.dom.querySelector(".cm-table-preview")).not.toBeNull();
    });

    act(() => {
      view.dispatch({ selection: EditorSelection.cursor(doc.indexOf("A")) });
    });

    expect(view.dom.querySelector(".cm-table-preview")).toBeNull();
    expect(view.contentDOM).toHaveTextContent("| A | B |");
  });

  it("places the caret in the clicked source cell", async () => {
    const doc = "Intro\n\n| Item | Status |\n| --- | --- |\n| Draft | Ready |";
    const view = makeView(doc);

    const readyCell = await waitFor(() => {
      const cell = view.dom.querySelector<HTMLElement>('[data-source-cell="2:1"]');
      expect(cell).not.toBeNull();
      return cell!;
    });

    fireEvent.mouseDown(readyCell);
    fireEvent.click(readyCell);

    expect(view.dom.querySelector(".cm-table-preview")).toBeNull();
    expect(view.state.selection.main.head).toBe(doc.indexOf("Ready"));
    expect(view.hasFocus).toBe(true);
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

  it("handles escaped pipes without breaking clicked-cell mapping", async () => {
    const doc = "Intro\n\n| A | B |\n| --- | --- |\n| x\\|y | Edit me |";
    const view = makeView(doc);

    const secondCell = await waitFor(() => {
      const cell = view.dom.querySelector<HTMLElement>('[data-source-cell="2:1"]');
      expect(cell).not.toBeNull();
      return cell!;
    });

    fireEvent.click(secondCell);
    expect(view.state.selection.main.head).toBe(doc.indexOf("Edit me"));
  });

  it("maps cells in valid tables without outer pipes", async () => {
    const doc = "Intro\n\nA | B\n--- | ---\nOne | Two";
    const view = makeView(doc);

    const firstCell = await waitFor(() => {
      const cell = view.dom.querySelector<HTMLElement>('[data-source-cell="2:0"]');
      expect(cell).not.toBeNull();
      return cell!;
    });

    fireEvent.click(firstCell);
    expect(view.state.selection.main.head).toBe(doc.indexOf("One"));
  });
});
