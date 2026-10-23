import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import React from "react";
import { Provider, createStore } from "jotai";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { foldedRanges } from "@codemirror/language";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { atom_headingFolds } from "@/app/atoms/ui-atoms";
import { headingFolding, toggleHeadingFold } from "../codemirror/heading-fold";
import { useCodeMirrorHeadingFold } from "./use-codemirror-heading-fold";

const DOC = "# One\na\n\n# Two\nb";

const views: EditorView[] = [];
afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
});

function openNote(store: ReturnType<typeof createStore>, path: string) {
  const wrapper = function StoreProvider({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };
  const view = new EditorView({
    state: EditorState.create({ doc: DOC, extensions: [markdown({ base: markdownLanguage }), headingFolding] }),
  });
  views.push(view);
  const hook = renderHook(() => useCodeMirrorHeadingFold(path), { wrapper });
  act(() => hook.result.current.onViewCreated(view));
  return { view, hook };
}

const foldCount = (view: EditorView) => foldedRanges(view.state).size;

describe("useCodeMirrorHeadingFold", () => {
  it("reopens a note with the headings it had folded, per path", () => {
    const store = createStore();
    const first = openNote(store, "a.md");
    act(() => {
      toggleHeadingFold(first.view, DOC.indexOf("# Two"));
      first.hook.result.current.onCursorActivity(first.view);
    });
    expect(store.get(atom_headingFolds)).toEqual({ "a.md": ["# Two"] });

    expect(foldCount(openNote(store, "a.md").view)).toBe(1);
    expect(foldCount(openNote(store, "b.md").view)).toBe(0);
  });

  it("forgets a heading once it's unfolded", () => {
    const store = createStore();
    store.set(atom_headingFolds, { "a.md": ["# One"] });
    const note = openNote(store, "a.md");
    expect(foldCount(note.view)).toBe(1);
    act(() => {
      toggleHeadingFold(note.view, 0);
      note.hook.result.current.onCursorActivity(note.view);
    });
    expect(store.get(atom_headingFolds)).toEqual({ "a.md": [] });
  });
});
