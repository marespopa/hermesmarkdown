import { describe, it, expect } from "vitest";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { codeFolding } from "@codemirror/language";
import { findCalloutFoldRanges, toggleCalloutFold, isRangeFolded } from "./callout-fold";

function makeView(doc: string) {
  const state = EditorState.create({ doc, extensions: [codeFolding()] });
  return new EditorView({ state });
}

describe("findCalloutFoldRanges", () => {
  it("finds a single callout's body range", () => {
    const doc = "> [!note] Title\n> Body line one\n> Body line two\nAfter";
    const ranges = findCalloutFoldRanges(doc);
    expect(ranges).toHaveLength(1);
    expect(ranges[0].initiallyCollapsed).toBe(false);
    const body = doc.slice(ranges[0].bodyFrom, ranges[0].bodyTo);
    expect(body).toBe("\n> Body line one\n> Body line two");
  });

  it("marks a callout with a trailing '-' as initially collapsed", () => {
    const doc = "> [!warning]- Careful\n> Body";
    const ranges = findCalloutFoldRanges(doc);
    expect(ranges[0].initiallyCollapsed).toBe(true);
  });

  it("does not mark a callout with a trailing '+' as collapsed", () => {
    const doc = "> [!info]+ Note\n> Body";
    const ranges = findCalloutFoldRanges(doc);
    expect(ranges[0].initiallyCollapsed).toBe(false);
  });

  it("finds multiple callouts in the same doc", () => {
    const doc = "> [!note] A\n> body a\n\n> [!tip] B\n> body b";
    const ranges = findCalloutFoldRanges(doc);
    expect(ranges).toHaveLength(2);
  });

  it("returns nothing for a callout with no body", () => {
    const doc = "> [!note] Title only\nPlain text after";
    const ranges = findCalloutFoldRanges(doc);
    expect(ranges).toHaveLength(0);
  });

  it("respects nested callout depth when finding the body's end", () => {
    const doc = "> [!note] Outer\n> Body\n> > Nested quote\nAfter";
    const ranges = findCalloutFoldRanges(doc);
    expect(ranges).toHaveLength(1);
    const body = doc.slice(ranges[0].bodyFrom, ranges[0].bodyTo);
    expect(body).toContain("Nested quote");
  });
});

describe("toggleCalloutFold / isRangeFolded", () => {
  it("folds and unfolds a range", () => {
    const doc = "> [!note] Title\n> Body";
    const view = makeView(doc);
    const [range] = findCalloutFoldRanges(doc);

    expect(isRangeFolded(view.state, range.bodyFrom, range.bodyTo)).toBe(false);

    toggleCalloutFold(view, range.bodyFrom, range.bodyTo, true);
    expect(isRangeFolded(view.state, range.bodyFrom, range.bodyTo)).toBe(true);

    toggleCalloutFold(view, range.bodyFrom, range.bodyTo, false);
    expect(isRangeFolded(view.state, range.bodyFrom, range.bodyTo)).toBe(false);
  });

  it("folding doesn't remove the underlying text from the document", () => {
    const doc = "> [!note] Title\n> Body";
    const view = makeView(doc);
    const [range] = findCalloutFoldRanges(doc);
    toggleCalloutFold(view, range.bodyFrom, range.bodyTo, true);
    expect(view.state.doc.toString()).toBe(doc);
  });
});
