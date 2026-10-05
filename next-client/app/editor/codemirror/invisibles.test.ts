import { Compartment, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import { invisibles } from "./invisibles";

const views: EditorView[] = [];

function createEditor(doc: string, on = true) {
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  const compartment = new Compartment();
  const view = new EditorView({
    parent,
    state: EditorState.create({ doc, extensions: compartment.of(on ? invisibles() : []) }),
  });
  views.push(view);
  return { view, compartment };
}

function emptyLineCount(view: EditorView) {
  return view.contentDOM.querySelectorAll(".cm-emptyLine").length;
}

afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
  document.body.replaceChildren();
});

describe("invisibles", () => {
  it("marks empty and whitespace-only lines, not lines with text", () => {
    const { view } = createEditor("# Title\n\nText\n   \nMore");
    const marked = [...view.contentDOM.querySelectorAll(".cm-emptyLine")].map((line) => line.textContent);
    expect(marked).toEqual(["", "   "]);
  });

  it("shows spaces and tabs", () => {
    const { view } = createEditor("a b\tc");
    expect(view.contentDOM.querySelector(".cm-highlightSpace")).not.toBeNull();
    expect(view.contentDOM.querySelector(".cm-highlightTab")).not.toBeNull();
  });

  it("follows edits to the document", () => {
    const { view } = createEditor("One\nTwo");
    expect(emptyLineCount(view)).toBe(0);
    view.dispatch({ changes: { from: 3, insert: "\n" } });
    expect(emptyLineCount(view)).toBe(1);
  });

  it("draws nothing when turned off, and leaves the text unchanged", () => {
    const { view, compartment } = createEditor("One\n\nTwo  three");
    view.dispatch({ effects: compartment.reconfigure([]) });
    expect(emptyLineCount(view)).toBe(0);
    expect(view.contentDOM.querySelector(".cm-highlightSpace")).toBeNull();
    expect(view.state.doc.toString()).toBe("One\n\nTwo  three");
  });
});
