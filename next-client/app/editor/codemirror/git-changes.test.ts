import { EditorState, Text } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeGitMarkers, gitChanges, gitChangesField, MAX_GIT_LINES, setGitBaseline } from "./git-changes";

const text = (value: string) => Text.of(value.split("\n"));

// The marker class at each marked line number (1-based).
function marks(base: Text | null, doc: Text): Record<number, string> {
  const found: Record<number, string> = {};
  const cursor = computeGitMarkers(base, doc).iter();
  while (cursor.value) {
    const dom = cursor.value.toDOM?.(null as never) as HTMLElement;
    found[doc.lineAt(cursor.from).number] = dom.className.replace("cm-git-marker ", "");
    cursor.next();
  }
  return found;
}

describe("computeGitMarkers", () => {
  it("marks added lines", () => {
    expect(marks(text("a\nb\nc"), text("a\nb\nnew\nc"))).toEqual({ 3: "cm-git-added" });
  });

  it("marks changed lines", () => {
    expect(marks(text("a\nb\nc"), text("a\nB\nc"))).toEqual({ 2: "cm-git-changed" });
  });

  it("marks a deletion in the middle at the top of the next line", () => {
    expect(marks(text("a\nb\nc"), text("a\nc"))).toEqual({ 2: "cm-git-deleted" });
  });

  it("marks a deletion at the end of the file on the last line, with the end class", () => {
    expect(marks(text("a\nb\nc"), text("a\nb"))).toEqual({ 2: "cm-git-deleted cm-git-deleted-end" });
  });

  it("marks lines added at the end of the file as added, not the line before them", () => {
    expect(marks(text("a\nb"), text("a\nb\nc"))).toEqual({ 3: "cm-git-added" });
  });

  it("marks every non-empty line as added without a baseline", () => {
    expect(marks(null, text("a\n\nb"))).toEqual({ 1: "cm-git-added", 3: "cm-git-added" });
  });

  it("returns no markers for identical text", () => {
    expect(computeGitMarkers(text("a\nb"), text("a\nb")).size).toBe(0);
  });

  it("returns no markers over the line limit", () => {
    const long = Text.of(Array.from({ length: MAX_GIT_LINES + 1 }, () => "x"));
    expect(computeGitMarkers(null, long).size).toBe(0);
  });

  it("treats a CRLF baseline as equal to the LF document", () => {
    const view = new EditorView({ state: EditorState.create({ doc: "a\nb\n", extensions: gitChanges() }) });
    view.dispatch({ effects: setGitBaseline.of({ text: "a\r\nb\r\n" }) });
    expect(view.state.field(gitChangesField).markers.size).toBe(0);
    view.destroy();
  });
});

describe("gitChanges extension", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("keeps bars on their lines while typing, then recomputes after 150 ms", () => {
    const view = new EditorView({ state: EditorState.create({ doc: "a\nb", extensions: gitChanges() }) });
    view.dispatch({ effects: setGitBaseline.of({ text: "a\nb" }) });
    expect(view.state.field(gitChangesField).markers.size).toBe(0);

    view.dispatch({ changes: { from: 3, insert: "!" } });
    expect(view.state.field(gitChangesField).markers.size).toBe(0);
    vi.advanceTimersByTime(150);
    expect(view.state.field(gitChangesField).markers.size).toBe(1);

    view.dispatch({ changes: { from: 3, to: 4 } });
    vi.advanceTimersByTime(150);
    expect(view.state.field(gitChangesField).markers.size).toBe(0);
    view.destroy();
  });

  it("shows nothing while the baseline is off", () => {
    const view = new EditorView({ state: EditorState.create({ doc: "a", extensions: gitChanges() }) });
    view.dispatch({ changes: { from: 1, insert: "b" } });
    vi.advanceTimersByTime(300);
    expect(view.state.field(gitChangesField).markers.size).toBe(0);
    view.destroy();
  });
});
