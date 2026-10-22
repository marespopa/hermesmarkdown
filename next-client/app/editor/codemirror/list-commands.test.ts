import { describe, it, expect } from "vitest";
import { EditorView } from "@codemirror/view";
import { EditorState, EditorSelection } from "@codemirror/state";
import { indentListOrLines, listItemHome, outdentListOrLines } from "./list-commands";

function makeView(doc: string, anchor = doc.length, head?: number) {
  return new EditorView({ state: EditorState.create({ doc, selection: EditorSelection.single(anchor, head) }) });
}

describe("listItemHome", () => {
  it("goes to the start of the item's text, then to the start of the line", () => {
    const view = makeView("  - groceries");
    expect(listItemHome(view)).toBe(true);
    expect(view.state.selection.main.head).toBe(4);
    expect(listItemHome(view)).toBe(true);
    expect(view.state.selection.main.head).toBe(0);
  });

  it("stops at a task's box", () => {
    const view = makeView("- [ ] ship release");
    listItemHome(view);
    expect(view.state.selection.main.head).toBe(2);
  });

  it("leaves other lines to the editor", () => {
    expect(listItemHome(makeView("plain"))).toBe(false);
    expect(listItemHome(makeView("- item", 0))).toBe(false);
  });
});

describe("indentListOrLines / outdentListOrLines", () => {
  it("nests a list item with its children, four spaces in", () => {
    const view = makeView("- a\n- b\n  - c", 6);
    expect(indentListOrLines(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("- a\n    - b\n      - c");
    expect(view.state.selection.main.head).toBe(10);
    expect(outdentListOrLines(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("- a\n- b\n  - c");
  });

  it("nests at the level the item above's children already use", () => {
    const view = makeView("- a\n  - x\n- b");
    indentListOrLines(view);
    expect(view.state.doc.toString()).toBe("- a\n  - x\n  - b");
  });

  it("nests an ordered item one level in and restarts its numbering", () => {
    const view = makeView("1. a\n2. b\n3. ");
    indentListOrLines(view);
    expect(view.state.doc.toString()).toBe("1. a\n2. b\n    1. ");
    expect(view.state.selection.main.head).toBe(view.state.doc.length);
  });

  it("continues the numbering of existing children when nesting", () => {
    const view = makeView("1. a\n   1. x\n2. b");
    indentListOrLines(view);
    expect(view.state.doc.toString()).toBe("1. a\n   1. x\n   2. b");
  });

  it("outdents an ordered item back to its parent's numbering", () => {
    const view = makeView("1. a\n2. b\n   1. c");
    outdentListOrLines(view);
    expect(view.state.doc.toString()).toBe("1. a\n2. b\n3. c");
  });

  it("aligns a bullet nested under a numbered item", () => {
    const view = makeView("10. a\n- b");
    indentListOrLines(view);
    expect(view.state.doc.toString()).toBe("10. a\n    - b");
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

  it("keeps Tab inside the editor on a top-level item that can't move out", () => {
    const view = makeView("- a", 3);
    expect(outdentListOrLines(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("- a");
  });
});
