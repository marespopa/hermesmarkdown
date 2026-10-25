import { getChunks, getOriginalDoc } from "@codemirror/merge";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import { gitChanges, gitChangesField, MAX_GIT_LINES, setGitBaseline } from "./git-changes";

let view: EditorView | null = null;
afterEach(() => {
  view?.destroy();
  view = null;
});

function editor(doc: string) {
  view = new EditorView({ state: EditorState.create({ doc, extensions: gitChanges() }), parent: document.body });
  return view;
}

const chunks = (editorView: EditorView) => getChunks(editorView.state)?.chunks ?? null;

describe("gitChanges", () => {
  it("shows no diff until a baseline arrives", () => {
    expect(chunks(editor("a\nb"))).toBeNull();
  });

  it("shows no chunks for text equal to HEAD, CRLF baseline included", () => {
    const v = editor("a\nb\n");
    v.dispatch({ effects: setGitBaseline.of({ text: "a\r\nb\r\n" }) });
    expect(chunks(v)).toEqual([]);
  });

  it("marks an added line as an insertion", () => {
    const v = editor("a\nb\nnew\nc");
    v.dispatch({ effects: setGitBaseline.of({ text: "a\nb\nc" }) });
    const [chunk] = chunks(v)!;
    expect(v.state.sliceDoc(chunk.fromB, chunk.endB)).toBe("new");
    expect(chunk.fromA).toBe(chunk.toA);
  });

  it("shows the old line of a changed line without accept or reject buttons", () => {
    const v = editor("a\nB\nc");
    v.dispatch({ effects: setGitBaseline.of({ text: "a\nb\nc" }) });
    expect(chunks(v)).toHaveLength(1);
    expect(v.dom.querySelector(".cm-deletedChunk")?.textContent).toContain("b");
    expect(v.dom.querySelector(".cm-chunkButtons")).toBeNull();
  });

  it("updates the diff as you type", () => {
    const v = editor("a\nb");
    v.dispatch({ effects: setGitBaseline.of({ text: "a\nb" }) });
    v.dispatch({ changes: { from: 3, insert: "\nc" } });
    expect(chunks(v)).toHaveLength(1);
    v.dispatch({ changes: { from: 3, to: 5 } });
    expect(chunks(v)).toEqual([]);
  });

  it("compares with a new HEAD when the baseline changes", () => {
    const v = editor("a\nb");
    v.dispatch({ effects: setGitBaseline.of({ text: "a" }) });
    expect(chunks(v)).toHaveLength(1);
    v.dispatch({ effects: setGitBaseline.of({ text: "a\nb" }) });
    expect(getOriginalDoc(v.state).toString()).toBe("a\nb");
    expect(chunks(v)).toEqual([]);
  });

  it("treats a file with no HEAD version as all added", () => {
    const v = editor("a\nb");
    v.dispatch({ effects: setGitBaseline.of({ text: null }) });
    const [chunk] = chunks(v)!;
    expect(v.state.sliceDoc(chunk.fromB, chunk.endB)).toBe("a\nb");
  });

  it("removes the diff when the baseline turns off", () => {
    const v = editor("a\nB");
    v.dispatch({ effects: setGitBaseline.of({ text: "a\nb" }) });
    v.dispatch({ effects: setGitBaseline.of("off") });
    expect(chunks(v)).toBeNull();
    expect(v.state.field(gitChangesField).active).toBe(false);
  });

  it("shows no diff over the line limit", () => {
    const v = editor(Array.from({ length: MAX_GIT_LINES + 1 }, () => "x").join("\n"));
    v.dispatch({ effects: setGitBaseline.of({ text: "" }) });
    expect(chunks(v)).toBeNull();
  });
});
