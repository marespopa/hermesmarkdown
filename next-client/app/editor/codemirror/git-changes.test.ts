import { Chunk } from "@codemirror/merge";
import { EditorState, Text } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import { addedRunsIn, gitChanges, gitChangesField, gitDiff, gitReplacedBlocks, goToNextGitChange, goToPreviousGitChange, MAX_GIT_LINES, setGitBaseline } from "./git-changes";

const text = (value: string) => Text.of(value.split("\n"));
const diffOf = (base: string, doc: string) => gitDiff(text(base), text(doc), Chunk.build(text(base), text(doc)));

describe("gitDiff", () => {
  it("marks an added line, with nothing deleted", () => {
    expect(diffOf("a\nb\nc", "a\nb\nnew\nc")).toEqual({ added: [3], deleted: [], hunks: [3] });
  });

  it("shows a changed line's old text above it", () => {
    expect(diffOf("a\nb\nc", "a\nB\nc")).toEqual({ added: [2], deleted: [{ before: 2, lines: ["b"] }], hunks: [2] });
  });

  it("shows a deletion in the middle above the next line", () => {
    expect(diffOf("a\nb\nc", "a\nc")).toEqual({ added: [], deleted: [{ before: 2, lines: ["b"] }], hunks: [2] });
  });

  it("shows a deletion at the end of the file after the last line", () => {
    expect(diffOf("a\nb\nc", "a\nb")).toEqual({ added: [], deleted: [{ before: 3, lines: ["c"] }], hunks: [2] });
  });

  it("doesn't show the line before as deleted when Enter adds a line after it", () => {
    expect(diffOf("a\nb", "a\nb\n")).toEqual({ added: [3], deleted: [], hunks: [3] });
    expect(diffOf("a\nb\nc", "a\nb\n\nc")).toEqual({ added: [3], deleted: [], hunks: [3] });
  });

  it("doesn't show HEAD's trailing empty line as deleted when lines are added at the end", () => {
    expect(diffOf("a\nb\n", "a\nb\n\nnew\nmore")).toEqual({ added: [4, 5], deleted: [], hunks: [4] });
  });

  it("marks every line as added for a file not in HEAD", () => {
    expect(diffOf("", "a\n\nb")).toEqual({ added: [1, 2, 3], deleted: [], hunks: [1] });
    expect(diffOf("", "")).toEqual({ added: [], deleted: [], hunks: [] });
  });
});

let view: EditorView | null = null;
afterEach(() => {
  view?.destroy();
  view = null;
});

function editor(doc: string) {
  view = new EditorView({ state: EditorState.create({ doc, extensions: gitChanges() }), parent: document.body });
  return view;
}

const added = (v: EditorView) => [...v.dom.querySelectorAll(".cm-git-added")].map((line) => line.textContent);
const deleted = (v: EditorView) => [...v.dom.querySelectorAll(".cm-git-deletedLine")].map((line) => line.textContent);

describe("gitChanges extension", () => {
  it("shows nothing until a baseline arrives", () => {
    const v = editor("a\nb");
    expect(added(v)).toEqual([]);
    expect(v.state.field(gitChangesField).base).toBeNull();
  });

  it("tints added lines and shows deleted ones above them", () => {
    const v = editor("a\nB\nc");
    v.dispatch({ effects: setGitBaseline.of({ text: "a\nb\nc" }) });
    expect(added(v)).toEqual(["B"]);
    expect(deleted(v)).toEqual(["b"]);
  });

  it("treats a CRLF baseline as equal to the LF document", () => {
    const v = editor("a\nb\n");
    v.dispatch({ effects: setGitBaseline.of({ text: "a\r\nb\r\n" }) });
    expect(added(v)).toEqual([]);
    expect(deleted(v)).toEqual([]);
  });

  it("updates as you type", () => {
    const v = editor("a\nb");
    v.dispatch({ effects: setGitBaseline.of({ text: "a\nb" }) });
    v.dispatch({ changes: { from: 3, insert: "\nc" } });
    expect(added(v)).toEqual(["c"]);
    expect(deleted(v)).toEqual([]);
    v.dispatch({ changes: { from: 3, to: 5 } });
    expect(added(v)).toEqual([]);
  });

  it("compares with a new HEAD when the baseline changes", () => {
    const v = editor("a\nb");
    v.dispatch({ effects: setGitBaseline.of({ text: "a" }) });
    expect(added(v)).toEqual(["b"]);
    v.dispatch({ effects: setGitBaseline.of({ text: "a\nb" }) });
    expect(added(v)).toEqual([]);
  });

  it("removes the diff when the baseline turns off", () => {
    const v = editor("a\nB");
    v.dispatch({ effects: setGitBaseline.of({ text: "a\nb" }) });
    v.dispatch({ effects: setGitBaseline.of("off") });
    expect(added(v)).toEqual([]);
    expect(deleted(v)).toEqual([]);
  });

  it("shows no diff over the line limit", () => {
    const v = editor(Array.from({ length: MAX_GIT_LINES + 1 }, () => "x").join("\n"));
    v.dispatch({ effects: setGitBaseline.of({ text: "" }) });
    expect(v.state.field(gitChangesField).base).toBeNull();
  });

  it("moves to the next and previous change, wrapping around", () => {
    const v = editor("a\nB\nc\nd\nE");
    v.dispatch({ effects: setGitBaseline.of({ text: "a\nb\nc\nd\ne" }) });
    const line = () => v.state.doc.lineAt(v.state.selection.main.head).number;
    expect(goToNextGitChange(v)).toBe(true);
    expect(line()).toBe(2);
    goToNextGitChange(v);
    expect(line()).toBe(5);
    goToNextGitChange(v);
    expect(line()).toBe(2);
    goToPreviousGitChange(v);
    expect(line()).toBe(5);
  });

  it("does nothing without changes", () => {
    const v = editor("a");
    v.dispatch({ effects: setGitBaseline.of({ text: "a" }) });
    expect(goToNextGitChange(v)).toBe(false);
  });

  it("keeps runs of added lines for the tint layer", () => {
    const v = editor("a\nX\nY\nb\nc\nd\ne\nZ");
    v.dispatch({ effects: setGitBaseline.of({ text: "a\nb\nc\nd\ne" }) });
    const { doc } = v.state;
    expect(addedRunsIn(v.state.field(gitChangesField).diff.added, doc, 0, doc.length)).toEqual([
      { from: doc.line(2).from, to: doc.line(3).to },
      { from: doc.line(8).from, to: doc.line(8).to },
    ]);
  });

  it("clips the runs to the lines asked for", () => {
    const doc = text("a\nb\nc\nd\ne");
    expect(addedRunsIn([1, 2, 3, 4, 5], doc, doc.line(2).from, doc.line(4).from)).toEqual([{ from: doc.line(2).from, to: doc.line(4).to }]);
    expect(addedRunsIn([1, 5], doc, doc.line(2).from, doc.line(4).to)).toEqual([]);
  });

  it("shows a deletion inside a table (a replaced block) above the table", () => {
    const doc = "a\nt1\nt3\nb";
    const tableFrom = 2;
    const tableTo = doc.indexOf("\nb");
    view = new EditorView({
      state: EditorState.create({ doc, extensions: [gitChanges(), gitReplacedBlocks.of(() => [{ from: tableFrom, to: tableTo }])] }),
      parent: document.body,
    });
    view.dispatch({ effects: setGitBaseline.of({ text: "a\nt1\nt2\nt3\nb" }) });
    const block = view.dom.querySelector(".cm-git-deleted");
    expect(block?.textContent).toBe("t2");
    expect(block?.nextElementSibling?.textContent).toBe("t1");
  });
});
