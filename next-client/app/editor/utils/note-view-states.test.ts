import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getNoteViewState, MAX_NOTE_VIEW_STATES, moveNoteViewState, resetNoteViewStates, setNoteViewState } from "./note-view-states";

const place = (n: number) => ({ anchor: n, head: n, scrollPos: n, scrollOffset: 0 });

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  resetNoteViewStates();
});
afterEach(() => vi.useRealTimers());

describe("note view states", () => {
  it("remembers a note's place across a reload", () => {
    setNoteViewState("a.md", place(5));
    vi.advanceTimersByTime(1000);
    resetNoteViewStates();
    expect(getNoteViewState("a.md")).toEqual(place(5));
  });

  it("follows a renamed note", () => {
    setNoteViewState("a.md", place(5));
    moveNoteViewState("a.md", "b.md");
    expect(getNoteViewState("a.md")).toBeNull();
    expect(getNoteViewState("b.md")).toEqual(place(5));
  });

  it("keeps only the most recent notes", () => {
    for (let i = 0; i <= MAX_NOTE_VIEW_STATES; i++) setNoteViewState(`${i}.md`, place(i));
    expect(getNoteViewState("0.md")).toBeNull();
    expect(getNoteViewState(`${MAX_NOTE_VIEW_STATES}.md`)).toEqual(place(MAX_NOTE_VIEW_STATES));
  });
});
