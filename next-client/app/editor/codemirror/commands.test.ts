import { describe, it, expect } from "vitest";
import { EditorView, keymap, runScopeHandlers } from "@codemirror/view";
import { EditorState, EditorSelection } from "@codemirror/state";
import {
  toggleBold,
  toggleItalic,
  toggleStrikethrough,
  toggleInlineCode,
  toggleCheckboxOnLine,
  continueQuoteOnEnter,
  indentCurrentSubtree,
  outdentCurrentSubtree,
  cycleTaskStatusOnCurrentLine,
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

describe("outline indentation commands", () => {
  it("indents and outdents the current list subtree", () => {
    const view = makeView("- Parent\n  - Child\n- Sibling", { anchor: 2 });

    expect(indentCurrentSubtree(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("  - Parent\n    - Child\n- Sibling");
    expect(view.state.selection.main.head).toBe(4);
    expect(outdentCurrentSubtree(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("- Parent\n  - Child\n- Sibling");
    expect(view.state.selection.main.head).toBe(2);
  });

  it("leaves non-list lines available for normal Tab behavior", () => {
    const view = makeView("plain text", { anchor: 3 });

    expect(indentCurrentSubtree(view)).toBe(false);
    expect(view.state.doc.toString()).toBe("plain text");
  });
});

describe("cycleTaskStatusOnCurrentLine", () => {
  it("cycles a task through todo, in-progress, done, and todo", () => {
    const view = makeView("- [ ] Task", { anchor: 4 });

    expect(cycleTaskStatusOnCurrentLine(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("- [/] Task");
    cycleTaskStatusOnCurrentLine(view);
    expect(view.state.doc.toString()).toBe("- [x] Task");
    cycleTaskStatusOnCurrentLine(view);
    expect(view.state.doc.toString()).toBe("- [ ] Task");
  });

  it("returns false for a non-task line", () => {
    const view = makeView("- A", { anchor: 2 });

    expect(cycleTaskStatusOnCurrentLine(view)).toBe(false);
  });

  it("handles mixed unordered and ordered lists through the CodeMirror keymap", () => {
    const content = "* Level 1\n      * Level 2\n          * Level 3\n1. Ordered one\n2. Ordered two\n     1. Sub-item A\n   2. Sub-item B";
    const state = EditorState.create({
      doc: content,
      extensions: [keymap.of([{ key: "Tab", run: indentCurrentSubtree }])],
    });
    const view = new EditorView({ state });
    view.dispatch({ selection: EditorSelection.cursor(content.indexOf("1. Ordered one")) });
    view.focus();
    const tabEvent = new KeyboardEvent("keydown", { key: "Tab" });
    Object.defineProperty(tabEvent, "keyCode", { value: 9 });

    expect(runScopeHandlers(view, tabEvent, "editor")).toBe(true);
    expect(view.state.doc.toString()).toContain("  1. Ordered one");
    view.destroy();
  });
});
