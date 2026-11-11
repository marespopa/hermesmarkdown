import { EditorState, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it, vi } from "vitest";
import { noteCalcExtension } from "./note-calc";

vi.mock("../utils/open-helper-dialogs", () => ({ openRenderedBlockSource: vi.fn() }));

const DOC = ["rent = 1200", "utilities = 180", "rent + utilities ="].join("\n");

const views: EditorView[] = [];

function runTab(view: EditorView): boolean {
  const event = new KeyboardEvent("keydown", { key: "Tab", code: "Tab", keyCode: 9, bubbles: true, cancelable: true });
  view.contentDOM.dispatchEvent(event);
  return event.defaultPrevented;
}

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

  it("shows the result after the trailing =  without changing the document", () => {
    const view = createEditor();
    expect(shownLabels(view)).toEqual(["1380"]);
    const label = view.dom.querySelector(".cm-note-calc-result")!;
    expect(label.closest(".cm-line")?.textContent).toBe("rent + utilities =1380");
    expect(label.getAttribute("aria-hidden")).toBe("true");
    expect(view.state.doc.toString()).toBe(DOC);
  });

  it("updates the label when an earlier variable changes", () => {
    const view = createEditor();
    const from = DOC.indexOf("1200");
    view.dispatch({ changes: { from, to: from + 4, insert: "1300" } });
    expect(shownLabels(view)).toEqual(["1480"]);
  });

  it("removes labels when the lines are wrapped in a code fence", () => {
    const view = createEditor();
    view.dispatch({ changes: [{ from: 0, insert: "```\n" }, { from: DOC.length, insert: "\n```" }] });
    expect(shownLabels(view)).toEqual([]);
  });

  it("Tab at the end of a result line writes the result into the text", () => {
    const view = createEditor();
    view.dispatch({ selection: { anchor: DOC.length } });
    expect(runTab(view)).toBe(true);
    expect(view.state.doc.toString()).toBe(`${DOC} 1380`);
    expect(view.state.selection.main.head).toBe(view.state.doc.length);
    expect(shownLabels(view)).toEqual([]);
  });

  it("Tab does nothing on lines without a result or with the caret mid-line", () => {
    const view = createEditor();
    view.dispatch({ selection: { anchor: 3 } });
    expect(runTab(view)).toBe(false);
    view.dispatch({ selection: { anchor: DOC.length - 2 } });
    expect(runTab(view)).toBe(false);
    expect(view.state.doc.toString()).toBe(DOC);
  });
});
