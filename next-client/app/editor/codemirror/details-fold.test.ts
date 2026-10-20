import { describe, expect, it } from "vitest";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { codeFolding } from "@codemirror/language";
import { buildDetailsMarkDecorations, detailsFoldRanges, setDetailsOpen } from "./details-fold";

const makeState = (doc: string) => EditorState.create({ doc, extensions: [codeFolding()] });
const makeView = (doc: string) => new EditorView({ state: makeState(doc) });

const section = "<details>\n<summary>Title</summary>\n\nBody\n\n</details>";

describe("detailsFoldRanges", () => {
  it("folds from the header line's end through the closing line", () => {
    const state = makeState(section);
    const [r] = detailsFoldRanges(state.doc);
    expect(r.blockId).toBe("details:0");
    expect(r.initiallyCollapsed).toBe(true);
    expect(r.titleOffset).toBe(state.doc.line(2).from);
    expect(state.doc.sliceString(r.bodyFrom, r.bodyTo)).toBe("\n\nBody\n\n</details>");
  });

  it("starts open sections expanded and skips one-line blocks", () => {
    expect(detailsFoldRanges(makeState(section.replace("<details>", "<details open>")).doc)[0].initiallyCollapsed).toBe(false);
    expect(detailsFoldRanges(makeState("<details><summary>A</summary>x</details>").doc)).toEqual([]);
  });
});

describe("setDetailsOpen", () => {
  it("adds and removes the open attribute", () => {
    const cases: [string, string][] = [
      ["<details>", "<details open>"],
      ['<details class="x">', '<details class="x" open>'],
    ];
    for (const [before, after] of cases) {
      const view = makeView(before + "\n<summary>T</summary>\nx\n</details>");
      expect(setDetailsOpen(view, 0, true)).toBe(true);
      expect(view.state.doc.line(1).text).toBe(after);
      expect(setDetailsOpen(view, 0, true)).toBe(false);
      expect(setDetailsOpen(view, 0, false)).toBe(true);
      expect(view.state.doc.line(1).text).toBe(before);
      view.destroy();
    }
    for (const tag of ["<details open>", '<details open="">', '<details open="open">']) {
      const view = makeView(tag + "\n<summary>T</summary>\nx\n</details>");
      expect(setDetailsOpen(view, 0, false)).toBe(true);
      expect(view.state.doc.line(1).text).toBe("<details>");
      view.destroy();
    }
  });

  it("returns false when there is no tag at the offset", () => {
    const view = makeView("plain");
    expect(setDetailsOpen(view, 0, true)).toBe(false);
    view.destroy();
  });
});

describe("buildDetailsMarkDecorations", () => {
  function collect(doc: string, active: number[]) {
    const state = makeState(doc);
    const out: { text: string; hidden: boolean; cls: string }[] = [];
    buildDetailsMarkDecorations(state, new Set(active)).between(0, doc.length, (from, to, value) => {
      const cls = (value.spec.class as string | undefined) ?? "";
      out.push({ text: doc.slice(from, to), hidden: !cls, cls });
    });
    return out;
  }

  it("bolds the summary, hides its tags off the caret line and dims them on it", () => {
    const off = collect(section, []);
    expect(off).toContainEqual(expect.objectContaining({ text: "Title", cls: "font-bold" }));
    expect(off).toContainEqual({ text: "<summary>", hidden: true, cls: "" });
    expect(off).toContainEqual({ text: "</summary>", hidden: true, cls: "" });
    const on = collect(section, [2]);
    expect(on.find((d) => d.text === "<summary>")?.hidden).toBe(false);
  });

  it("never hides a standalone <details> or </details> tag", () => {
    const off = collect(section, []);
    expect(off.find((d) => d.text === "<details>")?.hidden).toBe(false);
    expect(off.find((d) => d.text === "</details>")?.hidden).toBe(false);
  });

  it("hides an inline <details> tag off the caret line", () => {
    const inline = "<details><summary>T</summary>\nx\n</details>";
    expect(collect(inline, []).find((d) => d.text === "<details>")?.hidden).toBe(true);
    expect(collect(inline, [1]).find((d) => d.text === "<details>")?.hidden).toBe(false);
  });
});
