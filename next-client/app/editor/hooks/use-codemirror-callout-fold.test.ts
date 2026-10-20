import { act, renderHook } from "@testing-library/react";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { codeFolding } from "@codemirror/language";
import { findCalloutFoldRanges, isRangeFolded } from "../codemirror/callout-fold";
import { describe, expect, it } from "vitest";
import { useCodeMirrorCalloutFold } from "./use-codemirror-callout-fold";

const doc = [
  "> [!info] Near the top",
  "> body",
  "",
  "> [!tip] Far below, not rendered yet",
  "> body",
].join("\n");

function fakeView(renderedUpTo: number) {
  const state = EditorState.create({ doc });
  return {
    state,
    // CodeMirror returns null for positions outside the rendered viewport.
    coordsAtPos: (pos: number) => (pos <= renderedUpTo ? { top: 100 + pos, bottom: 120 + pos, left: 0, right: 0 } : null),
  } as unknown as EditorView;
}

describe("useCodeMirrorCalloutFold", () => {
  it("gives only rendered callouts a chevron, and adds the rest once they're rendered", () => {
    const container = document.createElement("div");
    container.getBoundingClientRect = () => ({ top: 100 } as DOMRect);
    const { result } = renderHook(() => useCodeMirrorCalloutFold({ containerRef: { current: container } }));

    act(() => result.current.onCursorActivity(fakeView(10)));
    expect(result.current.chevrons.map((c) => c.top)).toEqual([0]);

    act(() => result.current.onCursorActivity(fakeView(doc.length)));
    expect(result.current.chevrons).toHaveLength(2);
    expect(result.current.chevrons[1].top).toBeGreaterThan(0);
  });
});

describe("useCodeMirrorCalloutFold: toggle", () => {
  it("writes - when collapsing and + when expanding, so the fold is saved in the note", () => {
    const view = new EditorView({
      state: EditorState.create({ doc: "> [!note] Title\n> body", extensions: [codeFolding()] }),
      parent: document.body,
    });
    view.coordsAtPos = () => ({ top: 100, bottom: 120, left: 0, right: 0 });
    const container = document.createElement("div");
    container.getBoundingClientRect = () => ({ top: 0 } as DOMRect);
    const { result } = renderHook(() => useCodeMirrorCalloutFold({ containerRef: { current: container } }));
    const folded = () => {
      const [range] = findCalloutFoldRanges(view.state.doc.toString());
      return isRangeFolded(view.state, range.bodyFrom, range.bodyTo);
    };

    act(() => result.current.onCursorActivity(view));
    act(() => result.current.toggle(view, result.current.chevrons[0].blockId));
    expect(view.state.doc.toString()).toBe("> [!note]- Title\n> body");
    expect(folded()).toBe(true);

    act(() => result.current.toggle(view, result.current.chevrons[0].blockId));
    expect(view.state.doc.toString()).toBe("> [!note]+ Title\n> body");
    expect(folded()).toBe(false);
    view.destroy();
  });
});

describe("useCodeMirrorCalloutFold: <details> sections", () => {
  const section = (tag: string) => `${tag}\n<summary>Title</summary>\n\nBody\n\n</details>`;

  function setup(text: string) {
    const view = new EditorView({ state: EditorState.create({ doc: text, extensions: [codeFolding()] }), parent: document.body });
    view.coordsAtPos = () => ({ top: 100, bottom: 120, left: 0, right: 0 });
    const container = document.createElement("div");
    container.getBoundingClientRect = () => ({ top: 0 } as DOMRect);
    const hook = renderHook(() => useCodeMirrorCalloutFold({ containerRef: { current: container } }));
    return { view, hook };
  }
  const folded = (view: EditorView) => isRangeFolded(view.state, view.state.doc.line(2).to, view.state.doc.length);

  it("folds a closed section on open, leaves an open one expanded, and lists a details chevron", () => {
    const closed = setup(section("<details>"));
    act(() => closed.hook.result.current.onViewCreated(closed.view));
    expect(folded(closed.view)).toBe(true);
    expect(closed.hook.result.current.chevrons).toMatchObject([{ kind: "details", collapsed: true }]);
    closed.view.destroy();

    const open = setup(section("<details open>"));
    act(() => open.hook.result.current.onViewCreated(open.view));
    expect(folded(open.view)).toBe(false);
    expect(open.hook.result.current.chevrons).toMatchObject([{ kind: "details", collapsed: false }]);
    open.view.destroy();
  });

  it("writes and removes the open attribute as the chevron toggles", () => {
    const { view, hook } = setup(section("<details>"));
    act(() => hook.result.current.onViewCreated(view));
    act(() => hook.result.current.toggle(view, hook.result.current.chevrons[0].blockId));
    expect(view.state.doc.line(1).text).toBe("<details open>");
    expect(folded(view)).toBe(false);

    act(() => hook.result.current.toggle(view, hook.result.current.chevrons[0].blockId));
    expect(view.state.doc.line(1).text).toBe("<details>");
    expect(folded(view)).toBe(true);
    view.destroy();
  });
});
