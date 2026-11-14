import { describe, expect, it } from "vitest";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { history, undo } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { ensureSyntaxTree } from "@codemirror/language";
import { headingSpace } from "./heading-space";

function makeView(doc = "", caret = doc.length) {
  const state = EditorState.create({ doc, selection: { anchor: caret }, extensions: [markdown({ base: markdownLanguage }), history(), headingSpace] });
  ensureSyntaxTree(state, state.doc.length, 1000);
  return new EditorView({ state });
}

// Types `text` a key at a time through the input handlers, as the editor
// does for real keys; a key no handler takes is inserted plainly.
function type(view: EditorView, text: string) {
  for (const key of text) {
    const { from, to } = view.state.selection.main;
    const insert = () => view.state.update({ changes: { from, to, insert: key }, selection: { anchor: from + 1 }, userEvent: "input.type" });
    const handled = view.state.facet(EditorView.inputHandler).some((handler) => handler(view, from, to, key, insert));
    if (!handled) view.dispatch(insert());
  }
}

const read = (view: EditorView) => ({ doc: view.state.doc.toString(), caret: view.state.selection.main.head });

describe("headingSpace", () => {
  it("adds the space after # on an empty line, first or not", () => {
    const first = makeView();
    type(first, "#");
    expect(read(first)).toEqual({ doc: "# ", caret: 2 });
    type(first, "Title");
    expect(first.state.doc.toString()).toBe("# Title");

    const later = makeView("# Title\n\nText\n");
    type(later, "#");
    expect(read(later)).toEqual({ doc: "# Title\n\nText\n# ", caret: 16 });
  });

  it("adds it in front of a line's text", () => {
    const view = makeView("Title\nBody", 0);
    type(view, "#");
    expect(read(view)).toEqual({ doc: "# Title\nBody", caret: 2 });
    type(view, "#");
    expect(read(view)).toEqual({ doc: "## Title\nBody", caret: 3 });
  });

  it("deepens the heading on more #, up to six", () => {
    const view = makeView();
    type(view, "###");
    expect(read(view)).toEqual({ doc: "### ", caret: 4 });
    type(view, "###");
    expect(read(view)).toEqual({ doc: "###### ", caret: 7 });
    type(view, "#");
    expect(view.state.doc.toString()).toBe("###### #");
  });

  it("takes one space typed out of habit as the one already there", () => {
    const view = makeView();
    type(view, "# ");
    expect(view.state.doc.toString()).toBe("# ");
    type(view, " ");
    expect(view.state.doc.toString()).toBe("#  ");
  });

  it("is plain typing again after any other key or caret move", () => {
    const typed = makeView();
    type(typed, "#a");
    backspace(typed);
    type(typed, " #");
    expect(typed.state.doc.toString()).toBe("#  #");

    const moved = makeView();
    type(moved, "#");
    moved.dispatch({ selection: { anchor: 0 } });
    moved.dispatch({ selection: { anchor: 2 } });
    type(moved, "#");
    expect(moved.state.doc.toString()).toBe("# #");
  });

  it("undoes in one step", () => {
    const view = makeView();
    type(view, "#");
    undo(view);
    expect(view.state.doc.toString()).toBe("");
  });

  it("leaves # alone mid-line, before a space or another #", () => {
    const midLine = makeView("Issue ");
    type(midLine, "#");
    expect(midLine.state.doc.toString()).toBe("Issue #");

    const beforeSpace = makeView(" Title", 0);
    type(beforeSpace, "#");
    expect(beforeSpace.state.doc.toString()).toBe("# Title");

    const beforeHash = makeView("# Title", 0);
    type(beforeHash, "#");
    expect(beforeHash.state.doc.toString()).toBe("## Title");
  });

  it("leaves # alone in code and in frontmatter", () => {
    const code = makeView("```sh\n\n```", 6);
    type(code, "#");
    expect(code.state.doc.toString()).toBe("```sh\n#\n```");

    const frontmatter = makeView("---\n\n---\n", 4);
    type(frontmatter, "#");
    expect(frontmatter.state.doc.toString()).toBe("---\n#\n---\n");
  });
});

// Deletes the character before the caret, as Backspace would.
function backspace(view: EditorView) {
  const at = view.state.selection.main.head;
  view.dispatch({ changes: { from: at - 1, to: at }, userEvent: "delete.backward" });
}
