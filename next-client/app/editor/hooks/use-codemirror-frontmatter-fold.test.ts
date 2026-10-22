import { createElement, type ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { createStore, Provider } from "jotai";
import { beforeEach, describe, expect, it } from "vitest";
import { frontmatterCollapse, isFrontmatterFolded } from "../codemirror/frontmatter-fold";
import { useCodeMirrorFrontmatterFold } from "./use-codemirror-frontmatter-fold";

const doc = ["---", "title: Note", "---", "", "Body"].join("\n");

describe("useCodeMirrorFrontmatterFold", () => {
  // The new-note default persists in localStorage; each test starts from "expanded".
  beforeEach(() => localStorage.clear());

  it("opens new notes the way the last Properties row click left one", () => {
    const wrapper = freshStore();
    const a = openNote(wrapper);
    toggleFrom(a);
    expect(isFrontmatterFolded(openNote(wrapper).view.state)).toBe(true);

    toggleFrom(a);
    expect(isFrontmatterFolded(openNote(wrapper).view.state)).toBe(false);
  });

  it("doesn't remember a caret moving in, or change a note already open", () => {
    const wrapper = freshStore();
    const a = openNote(wrapper);
    const other = openNote(wrapper);
    toggleFrom(a);
    expect(isFrontmatterFolded(other.view.state)).toBe(false);

    act(() => a.view.dispatch({ selection: { anchor: 0 } }));
    expect(isFrontmatterFolded(a.view.state)).toBe(false);
    expect(isFrontmatterFolded(openNote(wrapper).view.state)).toBe(true);
  });
});

function freshStore() {
  const store = createStore();
  return function StoreWrapper({ children }: { children: ReactNode }) {
    return createElement(Provider, { store }, children);
  };
}

function openNote(wrapper: ReturnType<typeof freshStore>) {
  const view = new EditorView({ state: EditorState.create({ doc, extensions: frontmatterCollapse }) });
  const hook = renderHook(() => useCodeMirrorFrontmatterFold(), { wrapper });
  act(() => hook.result.current.onViewCreated(view));
  return { view, hook };
}

// A click on the header row.
function toggleFrom(note: ReturnType<typeof openNote>) {
  act(() => {
    note.view.contentDOM.querySelector<HTMLButtonElement>(".cm-frontmatter-summary")!.click();
  });
}
