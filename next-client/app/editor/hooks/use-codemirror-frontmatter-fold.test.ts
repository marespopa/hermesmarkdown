import { act, renderHook } from "@testing-library/react";
import { EditorState } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";
import { useCodeMirrorFrontmatterFold } from "./use-codemirror-frontmatter-fold";

const doc = ["---", "title: Note", "---", "", "Body"].join("\n");

describe("useCodeMirrorFrontmatterFold", () => {
  it("measures the container after coordsAtPos, which may scroll the canvas", () => {
    // Container and first line both start at 300 on screen.
    let scrollTop = 0;
    const container = document.createElement("div");
    container.getBoundingClientRect = () => ({ top: 300 - scrollTop } as DOMRect);
    const view = {
      state: EditorState.create({ doc }),
      // Like CodeMirror flushing a pending scrollIntoView before measuring.
      coordsAtPos: () => {
        scrollTop = 200;
        return { top: 300 - scrollTop, bottom: 320 - scrollTop, left: 0, right: 0 };
      },
    } as unknown as EditorView;

    // Stable refs, like useRef — fresh objects per render would re-fire the
    // hook's effect on every render and loop forever.
    const viewRef = { current: view };
    const containerRef = { current: container };
    const { result } = renderHook(() =>
      useCodeMirrorFrontmatterFold({ viewRef, containerRef, collapseByDefault: false }),
    );
    act(() => result.current.onCursorActivity(view));

    expect(result.current.chevrons.map((c) => c.top)).toEqual([0]);
  });
});
