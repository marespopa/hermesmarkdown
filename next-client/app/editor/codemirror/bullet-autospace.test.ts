import { describe, expect, it } from "vitest";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { bulletAutospace } from "./bullet-autospace";

function makeView(doc = "", cursor = doc.length) {
  const state = EditorState.create({
    doc,
    selection: EditorSelection.cursor(cursor),
    extensions: [markdown({ base: markdownLanguage }), bulletAutospace],
  });
  return new EditorView({ state });
}

// Types like the DOM does: the input handlers get the first say, and the
// text goes in as-is when none of them takes it.
function type(view: EditorView, text: string) {
  for (const char of text) {
    const { from, to } = view.state.selection.main;
    const insert = () => view.state.update({ changes: { from, to, insert: char }, selection: EditorSelection.cursor(from + char.length) });
    const handled = view.state.facet(EditorView.inputHandler).some((handler) => handler(view, from, to, char, insert));
    if (!handled) view.dispatch(insert());
  }
}

const text = (view: EditorView) => view.state.doc.toString();
const cursor = (view: EditorView) => view.state.selection.main.head;

describe("bulletAutospace", () => {
  it("adds the space after a dash at the start of a line", () => {
    const view = makeView();
    type(view, "-");
    expect(text(view)).toBe("- ");
    expect(cursor(view)).toBe(2);
    type(view, "milk");
    expect(text(view)).toBe("- milk");
  });

  it("swallows the space typed out of habit", () => {
    const view = makeView();
    type(view, "- milk");
    expect(text(view)).toBe("- milk");
  });

  it("still types a --- rule", () => {
    const view = makeView();
    type(view, "---");
    expect(text(view)).toBe("---");
  });

  it("works after an indent and inside a quote", () => {
    const indented = makeView("- a\n  ");
    type(indented, "-");
    expect(text(indented)).toBe("- a\n  - ");

    const quoted = makeView("> ");
    type(quoted, "-");
    expect(text(quoted)).toBe("> - ");
  });

  it("leaves dashes mid-line alone", () => {
    const view = makeView("well");
    type(view, " - ok");
    expect(text(view)).toBe("well - ok");
  });

  it("leaves code blocks alone", () => {
    const view = makeView("```\n\n```", 4);
    type(view, "-");
    expect(text(view)).toBe("```\n-\n```");
  });
});
