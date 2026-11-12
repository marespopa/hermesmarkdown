import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { history, undo } from "@codemirror/commands";
import { describe, expect, it } from "vitest";
import { runTidyNote } from "./tidy-note-command";

function viewOf(doc: string, anchor = 0) {
  return new EditorView({ state: EditorState.create({ doc, selection: { anchor }, extensions: [history()] }) });
}

describe("runTidyNote", () => {
  it("tidies the note in one step that undo takes back", () => {
    const doc = "Intro\n## Title\n1. a\n4. b";
    const view = viewOf(doc);
    expect(runTidyNote(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("Intro\n\n## Title\n\n1. a\n2. b");
    undo(view);
    expect(view.state.doc.toString()).toBe(doc);
  });

  it("reports a note that is already tidy and leaves it alone", () => {
    const view = viewOf("# Title\n\ntext\n");
    expect(runTidyNote(view)).toBe(false);
    expect(view.state.doc.toString()).toBe("# Title\n\ntext\n");
  });

  it("keeps the caret in the same text", () => {
    const view = viewOf("Intro\n## Title\nBody", 18);
    runTidyNote(view);
    const caret = view.state.selection.main.head;
    expect(view.state.doc.sliceString(caret - 2, caret)).toBe("od");
  });
});
