import { describe, it, expect } from "vitest";
import { EditorView } from "@codemirror/view";
import { EditorState, EditorSelection } from "@codemirror/state";
import {
  breakLineInListItem,
  continueListOnEnter,
  indentListOrLines,
  outdentListOrLines,
  removeListMarkerOnBackspace,
} from "./list-commands";

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
    expect(view.state.doc.toString()).toBe("- hello\n- world");
    expect(view.state.selection.main.head).toBe(10);
  });

  it("outdents an empty nested item to its parent's level", () => {
    const view = makeView("- a\n  - ");
    continueListOnEnter(view);
    expect(view.state.doc.toString()).toBe("- a\n- ");
  });

  it("outdents an empty nested ordered item and continues the parent numbering", () => {
    const view = makeView("1. a\n2. b\n   1. ");
    continueListOnEnter(view);
    expect(view.state.doc.toString()).toBe("1. a\n2. b\n3. ");
  });

  it("ends the list on an empty top-level item, leaving a blank line after it", () => {
    const view = makeView("- a\n- [ ] ");
    continueListOnEnter(view);
    expect(view.state.doc.toString()).toBe("- a\n\n");
    expect(view.state.selection.main.head).toBe(view.state.doc.length);
  });

  it("just clears a lone empty item", () => {
    const view = makeView("- ");
    continueListOnEnter(view);
    expect(view.state.doc.toString()).toBe("");
  });

  it("starts the next item from a line typed after Shift+Enter", () => {
    const view = makeView("1. a\n   more");
    expect(continueListOnEnter(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("1. a\n   more\n2. ");
  });

  it("leaves indented text that isn't part of an item alone", () => {
    expect(continueListOnEnter(makeView("    code"))).toBe(false);
    expect(continueListOnEnter(makeView("- a\n\n  later"))).toBe(false);
  });

  it("falls through on plain lines and when the cursor is inside the marker", () => {
    expect(continueListOnEnter(makeView("plain"))).toBe(false);
    expect(continueListOnEnter(makeView("- item", 0))).toBe(false);
  });
});

describe("breakLineInListItem", () => {
  it("starts a line inside the item, lined up with its text", () => {
    const view = makeView("1. one");
    expect(breakLineInListItem(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("1. one\n   ");
    expect(view.state.selection.main.head).toBe(view.state.doc.length);
  });

  it("lines up after a task box", () => {
    const view = makeView("  - [ ] task");
    breakLineInListItem(view);
    expect(view.state.doc.toString()).toBe("  - [ ] task\n        ");
  });

  it("falls through on plain lines", () => {
    expect(breakLineInListItem(makeView("plain"))).toBe(false);
  });
});

describe("indentListOrLines / outdentListOrLines", () => {
  it("nests a list item with its children", () => {
    const view = makeView("- a\n- b\n  - c", 6);
    expect(indentListOrLines(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("- a\n  - b\n    - c");
    expect(view.state.selection.main.head).toBe(8);
    expect(outdentListOrLines(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("- a\n- b\n  - c");
  });

  it("nests an ordered item under the text of the item above and restarts its numbering", () => {
    const view = makeView("1. a\n2. b\n3. ");
    indentListOrLines(view);
    expect(view.state.doc.toString()).toBe("1. a\n2. b\n   1. ");
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

describe("removeListMarkerOnBackspace", () => {
  it("turns an empty top-level item back into a plain line", () => {
    const view = makeView("- a\n- [ ] ");
    expect(removeListMarkerOnBackspace(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("- a\n");
  });

  it("keeps the text when removing the marker", () => {
    const view = makeView("- text", 2);
    removeListMarkerOnBackspace(view);
    expect(view.state.doc.toString()).toBe("text");
  });

  it("outdents a nested item first", () => {
    const view = makeView("- a\n  - ");
    removeListMarkerOnBackspace(view);
    expect(view.state.doc.toString()).toBe("- a\n- ");
  });

  it("falls through anywhere but right after the marker", () => {
    expect(removeListMarkerOnBackspace(makeView("- text"))).toBe(false);
    expect(removeListMarkerOnBackspace(makeView("plain"))).toBe(false);
    expect(removeListMarkerOnBackspace(makeView("- text", 2, 4))).toBe(false);
  });
});
