import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { EditorView, keymap, runScopeHandlers } from "@codemirror/view";
import { EditorState, EditorSelection } from "@codemirror/state";
import {
  toggleBold,
  toggleItalic,
  toggleStrikethrough,
  toggleInlineCode,
  toggleCheckboxOnLine,
  indentCurrentSubtree,
  outdentCurrentSubtree,
  cycleTaskStatusOnCurrentLine,
  formatKeymap,
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
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 12, 9, 0));
  });
  afterEach(() => vi.useRealTimers());

  it("checks an unchecked box and stamps the day it was done", () => {
    const view = makeView("- [ ] Task");
    const applied = toggleCheckboxOnLine(view, 1);
    expect(applied).toBe(true);
    expect(view.state.doc.toString()).toBe("- [x] Task @done(2026-10-12)");
  });

  it("unchecks a checked box and drops its done stamp", () => {
    const view = makeView("- [x] Task @done(2026-10-09)");
    toggleCheckboxOnLine(view, 1);
    expect(view.state.doc.toString()).toBe("- [ ] Task");
  });

  it("completes an in-progress or on-hold task, keeping its start date", () => {
    for (const box of ["/", "!"]) {
      const view = makeView(`- [${box}] Task @started(2026-10-08)`);
      toggleCheckboxOnLine(view, 1);
      expect(view.state.doc.toString()).toBe("- [x] Task @started(2026-10-08) @done(2026-10-12)");
    }
  });

  it("reopens a cancelled task", () => {
    const view = makeView("- [-] Task");
    toggleCheckboxOnLine(view, 1);
    expect(view.state.doc.toString()).toBe("- [ ] Task");
  });

  it("leaves tags on the line alone", () => {
    const view = makeView("- [ ] Task #todo");
    toggleCheckboxOnLine(view, 1);
    expect(view.state.doc.toString()).toBe("- [x] Task #todo @done(2026-10-12)");
  });

  it("returns false for a line with no checkbox", () => {
    const view = makeView("just text");
    expect(toggleCheckboxOnLine(view, 1)).toBe(false);
  });
});

describe("outline indentation commands", () => {
  it("indents and outdents the current list subtree", () => {
    const view = makeView("- Parent\n  - Child\n- Sibling", { anchor: 2 });

    expect(indentCurrentSubtree(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("    - Parent\n      - Child\n- Sibling");
    expect(view.state.selection.main.head).toBe(6);
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
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 12, 9, 0));
  });
  afterEach(() => vi.useRealTimers());

  it("cycles a task through todo, in-progress, done, and todo, with its stamps", () => {
    const view = makeView("- [ ] Task", { anchor: 4 });

    expect(cycleTaskStatusOnCurrentLine(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("- [/] Task @started(2026-10-12)");
    cycleTaskStatusOnCurrentLine(view);
    expect(view.state.doc.toString()).toBe("- [x] Task @started(2026-10-12) @done(2026-10-12)");
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

describe("formatKeymap", () => {
  function press(doc: string, cursor: number, init: KeyboardEventInit & { keyCode: number }) {
    const view = new EditorView({
      state: EditorState.create({ doc, selection: EditorSelection.cursor(cursor), extensions: [keymap.of(formatKeymap)] }),
    });
    const event = new KeyboardEvent("keydown", init);
    Object.defineProperty(event, "keyCode", { value: init.keyCode });
    const handled = runScopeHandlers(view, event, "editor");
    const text = view.state.doc.toString();
    view.destroy();
    return { handled, text };
  }

  it("strikes through on Ctrl+Shift+S and codes on Ctrl+Shift+M", () => {
    expect(press("", 0, { key: "S", keyCode: 83, ctrlKey: true, shiftKey: true }).text).toBe("~~~~");
    expect(press("", 0, { key: "M", keyCode: 77, ctrlKey: true, shiftKey: true }).text).toBe("``");
  });

  it("turns the line into a list or quote on Ctrl+Shift+7 / 8 / 9, by the digit's key", () => {
    expect(press("Item", 0, { key: "&", keyCode: 55, ctrlKey: true, shiftKey: true }).text).toBe("1. Item");
    expect(press("Item", 0, { key: "*", keyCode: 56, ctrlKey: true, shiftKey: true }).text).toBe("- Item");
    expect(press("Item", 0, { key: "(", keyCode: 57, ctrlKey: true, shiftKey: true }).text).toBe("> Item");
  });

  it("breaks the line on Enter without continuing a list or quote", () => {
    const enter = { key: "Enter", keyCode: 13 };
    expect(press("- item", 6, enter).text).toBe("- item\n");
    expect(press("1. [ ] task", 11, enter).text).toBe("1. [ ] task\n");
    expect(press("> quote", 7, enter).text).toBe("> quote\n");
    expect(press("  - nested", 10, enter).text).toBe("  - nested\n");
  });

  it("makes the line plain text on Ctrl+Alt+0", () => {
    expect(press("## Title", 3, { key: "0", keyCode: 48, ctrlKey: true, altKey: true }).text).toBe("Title");
  });
});
