import { EditorSelection, EditorState } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { describe, expect, it } from "vitest";
import { listCaretGuard } from "./list-caret";

function stateFor(doc: string, caret = 0) {
  return EditorState.create({
    doc,
    selection: EditorSelection.cursor(caret),
    extensions: [markdown({ base: markdownLanguage }), listCaretGuard],
  });
}

// Where the caret ends up after moving it to `to`.
function moveTo(state: EditorState, to: number, userEvent = "select") {
  return state.update({ selection: EditorSelection.cursor(to), userEvent }).state.selection.main.head;
}

describe("listCaretGuard", () => {
  it("moves a caret before a bullet to the start of its text", () => {
    const doc = "intro\n- groceries";
    expect(moveTo(stateFor(doc), 6, "select.pointer")).toBe(8);
    expect(moveTo(stateFor(doc), 7)).toBe(8);
  });

  it("keeps the caret out of a nested item's indent and a task's box", () => {
    expect(moveTo(stateFor("- top\n  - nested"), 6)).toBe(10);
    expect(moveTo(stateFor("- [ ] ship release"), 0)).toBe(6);
  });

  it("puts the caret after the bullet of an empty item", () => {
    expect(moveTo(stateFor("- first\n- "), 8)).toBe(10);
  });

  it("goes on to the line above on Left from the start of the text", () => {
    expect(moveTo(stateFor("intro\n- groceries", 8), 7)).toBe(5);
  });

  it("stays after the bullet on Left in the note's first item", () => {
    expect(moveTo(stateFor("- groceries", 2), 1)).toBe(2);
  });

  it("leaves ordered markers, selections and other lines alone", () => {
    expect(moveTo(stateFor("1. step"), 0)).toBe(0);
    expect(moveTo(stateFor("plain text", 5), 0)).toBe(0);
    expect(moveTo(stateFor("```\n- code\n```"), 4)).toBe(4);
    const range = stateFor("- groceries").update({ selection: EditorSelection.range(0, 11) }).state.selection.main;
    expect([range.from, range.to]).toEqual([0, 11]);
  });

  it("keeps a quoted item's caret after the bullet but allows the quote mark", () => {
    expect(moveTo(stateFor("> - quoted item"), 2)).toBe(4);
    expect(moveTo(stateFor("> - quoted item"), 0)).toBe(0);
  });
});
