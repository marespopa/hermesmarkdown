import React from "react";
import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { atom_pendingScrollTarget } from "@/app/atoms/atoms";
import { useScrollToPendingTarget } from "./use-scroll-to-pending-target";

describe("useScrollToPendingTarget", () => {
  let view: EditorView;
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    view = new EditorView({ state: EditorState.create({ doc: "first\nsecond line\nthird" }), parent });
    store = createStore();
    renderHook(() => useScrollToPendingTarget(view, "note.md"), {
      wrapper: ({ children }) => React.createElement(Provider, { store }, children),
    });
  });

  afterEach(async () => {
    // Let the line flash (scheduled for the next frame) run before teardown.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    view.destroy();
    document.body.innerHTML = "";
  });

  const target = (value: { path: string; line: number; column?: number }) =>
    act(() => store.set(atom_pendingScrollTarget, value));

  it("places the caret at the column within the line and clears the request", () => {
    target({ path: "note.md", line: 2, column: 7 });
    expect(view.state.selection.main.head).toBe(view.state.doc.line(2).from + 7);
    expect(store.get(atom_pendingScrollTarget)).toBeNull();
  });

  it("goes to the start of the line without a column", () => {
    target({ path: "note.md", line: 3 });
    expect(view.state.selection.main.head).toBe(view.state.doc.line(3).from);
  });

  it("clamps out-of-range lines and columns", () => {
    target({ path: "note.md", line: 2, column: 999 });
    expect(view.state.selection.main.head).toBe(view.state.doc.line(2).to);
    target({ path: "note.md", line: 99, column: -4 });
    expect(view.state.selection.main.head).toBe(view.state.doc.line(3).from);
  });

  it("ignores targets for another note", () => {
    target({ path: "other.md", line: 3, column: 2 });
    expect(view.state.selection.main.head).toBe(0);
    expect(store.get(atom_pendingScrollTarget)).not.toBeNull();
  });
});
