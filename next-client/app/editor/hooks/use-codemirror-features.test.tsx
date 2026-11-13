import { Compartment, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildExtensions } from "../codemirror/extensions";
import { useCodeMirrorFeatures } from "./use-codemirror-features";

const NOTE = [
  "---",
  "title: Budget",
  "tags: [budget, finance, income, expense]",
  "last updated: 2026-11-13",
  "---",
  "",
  "Review on 2026-12-01.",
].join("\n");

function mount(doc: string) {
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  const onCursorActivity = vi.fn<(view: EditorView) => void>();
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: buildExtensions({
        wordWrap: true,
        wordWrapCompartment: new Compartment(),
        lineNumbers: false,
        lineNumbersCompartment: new Compartment(),
        showInvisibles: false,
        invisiblesCompartment: new Compartment(),
        vimMode: false,
        vimModeCompartment: new Compartment(),
        flowMode: false,
        flowModeCompartment: new Compartment(),
        onOpenActiveHelperRef: { current: () => false },
        onFocusChange: vi.fn(),
        onCursorActivity,
        slashMenuCallbacksRef: { current: {} as never },
        wikiLinkTriggerRef: { current: null },
      }),
    }),
  });
  // jsdom has no layout; the pills only need some coordinates.
  vi.spyOn(view, "coordsAtPos").mockReturnValue({ top: 0, bottom: 0, left: 0, right: 0 });
  const hook = renderHook(() =>
    useCodeMirrorFeatures({ viewRef: { current: view }, editorView: view, containerRef: { current: parent } }),
  );
  onCursorActivity.mockImplementation((v) => hook.result.current.onCursorActivity(v));
  return { parent, view, hook, onCursorActivity };
}

describe("useCodeMirrorFeatures date detection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("finds a date in the frontmatter under the caret", () => {
    const { view, hook } = mount(NOTE);

    act(() => {
      view.dispatch({ selection: { anchor: NOTE.indexOf("2026-11-13") + 4 } });
      vi.advanceTimersByTime(60);
    });

    expect(hook.result.current.dateMatch?.rawString).toBe("2026-11-13");
    view.destroy();
  });

  it("finds a date in the note's text under the caret", () => {
    const { view, hook } = mount(NOTE);

    act(() => {
      view.dispatch({ selection: { anchor: NOTE.indexOf("2026-12-01") + 4 } });
      vi.advanceTimersByTime(60);
    });

    expect(hook.result.current.dateMatch?.rawString).toBe("2026-12-01");
    view.destroy();
  });

  it("keeps the date found while the editor sits idle", async () => {
    const { view, hook, onCursorActivity } = mount(NOTE);

    act(() => {
      view.dispatch({ selection: { anchor: NOTE.indexOf("2026-11-13") + 4 } });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    // Nothing keeps re-running detection (which would starve its short delay).
    const calls = onCursorActivity.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(onCursorActivity.mock.calls.length).toBe(calls);
    expect(hook.result.current.dateMatch?.rawString).toBe("2026-11-13");
    view.destroy();
  });
});
