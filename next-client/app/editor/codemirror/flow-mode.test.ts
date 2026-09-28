import { EditorSelection, EditorState, Text } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";
import { flowMode, paragraphLinesAt, shouldTypewriterScroll } from "./flow-mode";

const DOC = ["# Title", "", "First line", "second line", "", "Last"].join("\n");

function createEditor(doc = DOC, cursor = 0) {
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  const view = new EditorView({
    parent,
    state: EditorState.create({ doc, selection: EditorSelection.cursor(cursor), extensions: flowMode() }),
  });
  return { parent, view };
}

function activeLineTexts(view: EditorView) {
  return Array.from(view.contentDOM.querySelectorAll(".cm-flowActive")).map((line) => line.textContent);
}

describe("paragraphLinesAt", () => {
  const doc = Text.of(DOC.split("\n"));

  it("spans the run of non-blank lines around the position", () => {
    expect(paragraphLinesAt(doc, doc.line(4).from)).toEqual({ first: 3, last: 4 });
  });

  it("treats a blank line as its own paragraph", () => {
    expect(paragraphLinesAt(doc, doc.line(2).from)).toEqual({ first: 2, last: 2 });
  });

  it("stops at the document edges", () => {
    expect(paragraphLinesAt(doc, 0)).toEqual({ first: 1, last: 1 });
    expect(paragraphLinesAt(doc, doc.length)).toEqual({ first: 6, last: 6 });
  });
});

describe("shouldTypewriterScroll", () => {
  const events = (...names: string[]) => (event: string) =>
    names.some((name) => name === event || name.startsWith(`${event}.`));

  it("centers on typing, deleting, undo and keyboard selection", () => {
    expect(shouldTypewriterScroll(events("input.type"))).toBe(true);
    expect(shouldTypewriterScroll(events("delete.backward"))).toBe(true);
    expect(shouldTypewriterScroll(events("undo"))).toBe(true);
    expect(shouldTypewriterScroll(events("select"))).toBe(true);
  });

  it("leaves pointer selections, external reloads and untagged changes alone", () => {
    expect(shouldTypewriterScroll(events("select.pointer"))).toBe(false);
    expect(shouldTypewriterScroll(events("input.external"))).toBe(false);
    expect(shouldTypewriterScroll(events())).toBe(false);
  });
});

describe("flowMode", () => {
  it("marks the editor and highlights only the caret's paragraph", () => {
    const { parent, view } = createEditor(DOC, DOC.indexOf("second"));

    expect(view.dom).toHaveClass("cm-flowMode");
    expect(activeLineTexts(view)).toEqual(["First line", "second line"]);

    view.destroy();
    parent.remove();
  });

  it("moves the highlight with the caret", () => {
    const { parent, view } = createEditor(DOC, DOC.indexOf("second"));

    view.dispatch({ selection: EditorSelection.cursor(DOC.indexOf("Last")), userEvent: "select" });
    expect(activeLineTexts(view)).toEqual(["Last"]);

    view.destroy();
    parent.remove();
  });

  it("leaves the document text unchanged", () => {
    const { parent, view } = createEditor();

    expect(view.state.doc.toString()).toBe(DOC);

    view.destroy();
    parent.remove();
  });
});
