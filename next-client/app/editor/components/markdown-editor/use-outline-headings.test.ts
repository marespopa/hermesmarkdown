import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { python } from "@codemirror/lang-python";
import { useOutlineHeadings } from "./use-outline-headings";

const PY = "# setup notes\nclass Report:\n    def render(self):\n        pass\n";

describe("useOutlineHeadings", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("lists a note's headings straight from its text", () => {
    const { result } = renderHook(() => useOutlineHeadings(null, "# Plan\n\n## Goals", false));
    expect(result.current.map((heading) => heading.text)).toEqual(["Plan", "Goals"]);
  });

  it("lists a code file's symbols from its syntax tree once typing stops, not its # comments", () => {
    const view = new EditorView({ state: EditorState.create({ doc: PY, extensions: python() }) });
    const { result } = renderHook(() => useOutlineHeadings(view, PY, true));
    expect(result.current).toEqual([]);

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(result.current).toEqual([
      { level: 1, text: "Report", line: 2, kind: "class" },
      { level: 2, text: "render", line: 3, kind: "method" },
    ]);
    view.destroy();
  });

  it("lists a C# file's symbols from its text once typing stops", () => {
    const source = "class Store\n{\n    public void Load() {}\n}\n";
    const { result } = renderHook(() => useOutlineHeadings(null, source, true, "src/Store.cs"));
    expect(result.current).toEqual([]);

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(result.current).toEqual([
      { level: 1, text: "Store", line: 1, kind: "class" },
      { level: 2, text: "Load", line: 3, kind: "method" },
    ]);
  });
});
