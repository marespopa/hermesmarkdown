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

  it("collapses and expands a note in every pane showing it", () => {
    const wrapper = freshStore();
    const a = openPane("note.md", wrapper);
    const b = openPane("note.md", wrapper);
    const other = openPane("other.md", wrapper);

    toggleFrom(a);
    expect(isFrontmatterFolded(a.view.state)).toBe(true);
    expect(isFrontmatterFolded(b.view.state)).toBe(true);
    expect(isFrontmatterFolded(other.view.state)).toBe(false);

    toggleFrom(b);
    expect(isFrontmatterFolded(a.view.state)).toBe(false);
  });

  it("opens a note the way another pane shows it, and forgets once all close", () => {
    const wrapper = freshStore();
    const a = openPane("note.md", wrapper);
    toggleFrom(a); // collapsed, and remembered for new notes
    act(() => {
      // Arrowing into it expands this note without changing that.
      a.view.dispatch({ selection: { anchor: 0 } });
      a.hook.result.current.onCursorActivity(a.view);
    });

    const b = openPane("note.md", wrapper);
    expect(isFrontmatterFolded(b.view.state)).toBe(false);

    a.hook.unmount();
    b.hook.unmount();
    const c = openPane("note.md", wrapper);
    expect(isFrontmatterFolded(c.view.state)).toBe(true);
  });

  it("opens new notes the way the last Properties row click left one", () => {
    const wrapper = freshStore();
    const a = openPane("note.md", wrapper);
    toggleFrom(a);
    expect(isFrontmatterFolded(openPane("other.md", wrapper).view.state)).toBe(true);

    toggleFrom(a);
    expect(isFrontmatterFolded(openPane("third.md", wrapper).view.state)).toBe(false);
  });

  it("doesn't remember a caret moving in, or change notes already open", () => {
    const wrapper = freshStore();
    const a = openPane("note.md", wrapper);
    const other = openPane("other.md", wrapper);
    toggleFrom(a);
    expect(isFrontmatterFolded(other.view.state)).toBe(false);

    act(() => {
      a.view.dispatch({ selection: { anchor: 0 } });
      a.hook.result.current.onCursorActivity(a.view);
    });
    expect(isFrontmatterFolded(a.view.state)).toBe(false);
    expect(isFrontmatterFolded(openPane("third.md", wrapper).view.state)).toBe(true);
  });

  it("keeps drafts independent", () => {
    const wrapper = freshStore();
    const a = openPane("draft", wrapper);
    const b = openPane("draft", wrapper);
    toggleFrom(a);
    expect(isFrontmatterFolded(b.view.state)).toBe(false);
  });
});

function freshStore() {
  const store = createStore();
  return function StoreWrapper({ children }: { children: ReactNode }) {
    return createElement(Provider, { store }, children);
  };
}

function openPane(filePath: string, wrapper: ReturnType<typeof freshStore>) {
  const view = new EditorView({ state: EditorState.create({ doc, extensions: frontmatterCollapse }) });
  const viewRef = { current: view };
  const hook = renderHook(
    () => useCodeMirrorFrontmatterFold({ viewRef, filePath }),
    { wrapper },
  );
  act(() => hook.result.current.onViewCreated(view));
  return { view, hook };
}

// A click on the header row; the editor reports the change to the hook as
// it does any transaction (the update listener in extensions.ts).
function toggleFrom(pane: ReturnType<typeof openPane>) {
  act(() => {
    pane.view.contentDOM.querySelector<HTMLButtonElement>(".cm-frontmatter-summary")!.click();
    pane.hook.result.current.onCursorActivity(pane.view);
  });
}
