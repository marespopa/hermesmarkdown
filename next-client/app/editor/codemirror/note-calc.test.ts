import { EditorState, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it, vi } from "vitest";
import { noteCalcExtension } from "./note-calc";
import { previewExtension } from "./preview-mode";

vi.mock("../utils/open-helper-dialogs", () => ({ openRenderedBlockSource: vi.fn() }));

const DOC = ["rent = 1200", "utilities = 180", "rent + utilities"].join("\n");

const views: EditorView[] = [];

function createEditor(doc = DOC, extra: Extension = []) {
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  const state = EditorState.create({ doc, extensions: [noteCalcExtension, extra] });
  const view = new EditorView({ parent, state });
  views.push(view);
  return view;
}

function shownLabels(view: EditorView): string[] {
  return Array.from(view.dom.querySelectorAll(".cm-note-calc-result")).map((node) => node.textContent ?? "");
}

describe("noteCalcExtension", () => {
  afterEach(() => {
    for (const view of views.splice(0)) {
      view.dom.parentElement?.remove();
      view.destroy();
    }
  });

  it("shows the result at the end of the expression line without changing the document", () => {
    const view = createEditor();
    expect(shownLabels(view)).toEqual(["= 1380"]);
    const label = view.dom.querySelector(".cm-note-calc-result")!;
    expect(label.closest(".cm-line")?.textContent).toBe("rent + utilities= 1380");
    expect(label.getAttribute("aria-hidden")).toBe("true");
    expect(view.state.doc.toString()).toBe(DOC);
  });

  it("updates the label when an earlier variable changes", () => {
    const view = createEditor();
    const from = DOC.indexOf("1200");
    view.dispatch({ changes: { from, to: from + 4, insert: "1300" } });
    expect(shownLabels(view)).toEqual(["= 1480"]);
  });

  it("removes labels when the lines are wrapped in a code fence", () => {
    const view = createEditor();
    view.dispatch({ changes: [{ from: 0, insert: "```\n" }, { from: DOC.length, insert: "\n```" }] });
    expect(shownLabels(view)).toEqual([]);
  });

  it("still renders labels in Preview", () => {
    const view = createEditor(DOC, previewExtension(true));
    expect(shownLabels(view)).toEqual(["= 1380"]);
  });
});
