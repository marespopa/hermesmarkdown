import { describe, it, expect } from "vitest";
import { EditorView } from "@codemirror/view";
import { EditorState, EditorSelection } from "@codemirror/state";
import {
  toggleBold,
  toggleItalic,
  toggleStrikethrough,
  toggleInlineCode,
  toggleCheckboxOnLine,
  continueQuoteOnEnter,
} from "./commands";

// Headless EditorView: no `parent` DOM node, so no real layout — fine for
// pure transaction-dispatch commands, which never touch coordsAtPos/DOM.
function makeView(doc: string, selection?: { anchor: number; head?: number }) {
  const state = EditorState.create({
    doc,
    selection: selection ? EditorSelection.single(selection.anchor, selection.head) : undefined,
  });
  return new EditorView({ state });
}

describe("toggleBold / toggleItalic / toggleStrikethrough / toggleInlineCode", () => {
  it("wraps a selection in ** markers", () => {
    const view = makeView("hello world", { anchor: 0, head: 5 });
    toggleBold(view);
    expect(view.state.doc.toString()).toBe("**hello** world");
  });

  it("wraps an empty selection (cursor) and places the cursor between markers", () => {
    const view = makeView("", { anchor: 0 });
    toggleItalic(view);
    expect(view.state.doc.toString()).toBe("__");
    expect(view.state.selection.main.head).toBe(1);
  });

  it("wraps a selection in ~~ for strikethrough", () => {
    const view = makeView("done", { anchor: 0, head: 4 });
    toggleStrikethrough(view);
    expect(view.state.doc.toString()).toBe("~~done~~");
  });

  it("wraps a selection in backticks for inline code", () => {
    const view = makeView("const x = 1", { anchor: 0, head: 11 });
    toggleInlineCode(view);
    expect(view.state.doc.toString()).toBe("`const x = 1`");
  });
});

describe("toggleCheckboxOnLine", () => {
  it("checks an unchecked box", () => {
    const view = makeView("- [ ] Task");
    const applied = toggleCheckboxOnLine(view, 1);
    expect(applied).toBe(true);
    expect(view.state.doc.toString()).toBe("- [x] Task");
  });

  it("unchecks a checked box", () => {
    const view = makeView("- [x] Task");
    toggleCheckboxOnLine(view, 1);
    expect(view.state.doc.toString()).toBe("- [ ] Task");
  });

  it("syncs a #todo/#done status tag on the same line when checking", () => {
    const view = makeView("- [ ] Task #todo");
    toggleCheckboxOnLine(view, 1);
    expect(view.state.doc.toString()).toBe("- [x] Task #done");
  });

  it("syncs the status tag back to #todo when unchecking", () => {
    const view = makeView("- [x] Task #done");
    toggleCheckboxOnLine(view, 1);
    expect(view.state.doc.toString()).toBe("- [ ] Task #todo");
  });

  it("returns false for a line with no checkbox", () => {
    const view = makeView("just text");
    expect(toggleCheckboxOnLine(view, 1)).toBe(false);
  });
});

describe("continueQuoteOnEnter", () => {
  it("continues the quote prefix onto a new line", () => {
    const view = makeView("> hello", { anchor: 7 });
    const applied = continueQuoteOnEnter(view);
    expect(applied).toBe(true);
    expect(view.state.doc.toString()).toBe("> hello\n> ");
  });

  it("exits the block by stripping the prefix on an empty quoted line", () => {
    const view = makeView("> hello\n> ", { anchor: 10 });
    // Move cursor onto the second (empty) quoted line before pressing Enter.
    view.dispatch({ selection: EditorSelection.cursor(10) });
    continueQuoteOnEnter(view);
    expect(view.state.doc.toString()).toBe("> hello\n");
  });

  it("does nothing (returns false) on a non-quoted line", () => {
    const view = makeView("plain text", { anchor: 5 });
    expect(continueQuoteOnEnter(view)).toBe(false);
  });
});
