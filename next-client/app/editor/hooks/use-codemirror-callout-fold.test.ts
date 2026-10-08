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
