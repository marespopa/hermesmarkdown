import { describe, it, expect } from "vitest";
import { EditorView } from "@codemirror/view";
import { EditorState, EditorSelection } from "@codemirror/state";
import { continueListOnEnter, indentListOrLines, outdentListOrLines } from "./list-commands";

function makeView(doc: string, anchor = doc.length, head?: number) {
  return new EditorView({ state: EditorState.create({ doc, selection: EditorSelection.single(anchor, head) }) });
}

describe("continueListOnEnter", () => {
  it("starts a new bullet item with the same marker and indent", () => {
    const view = makeView("  * one");
    expect(continueListOnEnter(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("  * one\n  * ");
    expect(view.state.selection.main.head).toBe(view.state.doc.length);
  });

  it("increments ordered list numbers and keeps the delimiter", () => {
    const view = makeView("9) nine");
    continueListOnEnter(view);
    expect(view.state.doc.toString()).toBe("9) nine\n10) ");
  });

  it("starts an unchecked task after a task item", () => {
    const view = makeView("- [x] done");
    continueListOnEnter(view);
    expect(view.state.doc.toString()).toBe("- [x] done\n- [ ] ");
  });

  it("splits the item when the cursor is mid-text", () => {
    const view = makeView("- hello world", 7);
    continueListOnEnter(view);
    expect(view.state.doc.toString()).toBe("- hello\n-  world");
  });

  it("outdents an empty nested item", () => {
    const view = makeView("- a\n  - ");
    continueListOnEnter(view);
    expect(view.state.doc.toString()).toBe("- a\n- ");
  });

  it("ends the list on an empty top-level item", () => {
    const view = makeView("- a\n- [ ] ");
    continueListOnEnter(view);
    expect(view.state.doc.toString()).toBe("- a\n");
  });

  it("falls through on plain lines and when the cursor is inside the marker", () => {
    expect(continueListOnEnter(makeView("plain"))).toBe(false);
    expect(continueListOnEnter(makeView("- item", 0))).toBe(false);
  });
});

describe("indentListOrLines / outdentListOrLines", () => {
  it("nests a list item with its children", () => {
    const view = makeView("- a\n- b\n  - c", 6);
    expect(indentListOrLines(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("- a\n  - b\n    - c");
    expect(outdentListOrLines(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("- a\n- b\n  - c");
  });

  it("indents a plain line", () => {
    const view = makeView("text", 2);
    expect(indentListOrLines(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("  text");
  });

  it("indents every line of a multi-line selection", () => {
    const view = makeView("- a\n- b", 0, 7);
    indentListOrLines(view);
    expect(view.state.doc.toString()).toBe("  - a\n  - b");
  });
});
