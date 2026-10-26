"use client";

import { useCallback, useRef } from "react";
import { EditorSelection, type StateEffect } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { getNoteViewState, setNoteViewState, type NoteViewState } from "../utils/note-view-states";

// The note's place on return: the editor opens it with the selection and
// scroll position it had when it was last in front (note-view-states.ts,
// also after a reload). Saved on every caret move and scroll.
export function useCodeMirrorViewState(filePath: string) {
  const filePathRef = useRef(filePath);
  filePathRef.current = filePath;

  const save = useCallback((view: EditorView) => {
    const { anchor, head } = view.state.selection.main;
    const target = view.scrollSnapshot().value as unknown as { range: { head: number }; yMargin: number };
    setNoteViewState(filePathRef.current, { anchor, head, scrollPos: target.range.head, scrollOffset: target.yMargin });
  }, []);

  const onViewCreated = useCallback((view: EditorView) => {
    const state = getNoteViewState(filePathRef.current);
    if (state) restoreViewState(view, state);
    let frame = 0;
    view.scrollDOM.addEventListener("scroll", () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => save(view));
    }, { passive: true });
  }, [save]);

  return { onViewCreated, onCursorActivity: save };
}

// The saved selection (clamped to the text as it is now) and the exact
// scroll position: a scroll snapshot as CodeMirror makes one, its reference
// line and offset put back (`scrollSnapshot` has no public constructor, so
// it's built from a fresh snapshot's own class).
export function restoreViewState(view: EditorView, state: NoteViewState): void {
  const length = view.state.doc.length;
  const clamp = (pos: number) => Math.max(0, Math.min(length, pos));
  const snapshot = view.scrollSnapshot();
  const Target = (snapshot.value as object).constructor as new (...args: unknown[]) => unknown;
  const scroll = (snapshot as unknown as { type: { of(value: unknown): StateEffect<unknown> } }).type.of(
    new Target(EditorSelection.cursor(clamp(state.scrollPos)), "start", "start", state.scrollOffset, 0, true),
  );
  view.dispatch({
    selection: EditorSelection.single(clamp(state.anchor), clamp(state.head)),
    effects: scroll,
  });
}
