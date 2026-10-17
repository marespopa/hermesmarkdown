import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { collectInVisibleLines, visibleLineRanges } from "./visible-lines";

function viewWithVisible(doc: string, visible: { from: number; to: number }[]) {
  const view = new EditorView({ state: EditorState.create({ doc }) });
  Object.defineProperty(view, "visibleRanges", { value: visible });
  return view;
}

describe("visibleLineRanges", () => {
  it("widens ranges to whole lines and merges the ones that touch", () => {
    const doc = "one\ntwo\nthree\nfour";
    const view = viewWithVisible(doc, [{ from: 1, to: 5 }, { from: 6, to: 9 }]);
    expect(visibleLineRanges(view)).toEqual([{ from: 0, to: 13 }]);
  });
});

describe("collectInVisibleLines", () => {
  it("shifts matches from the visible text back to document positions", () => {
    const doc = "skip [[A]]\nkeep [[B]]";
    const view = viewWithVisible(doc, [{ from: 11, to: doc.length }]);
    const matches = collectInVisibleLines(view, (text) =>
      [...text.matchAll(/\[\[(\w)\]\]/g)].map((m) => ({ from: m.index!, to: m.index! + m[0].length, name: m[1] })),
    );
    expect(matches).toEqual([{ from: 16, to: 21, name: "B" }]);
  });
});
