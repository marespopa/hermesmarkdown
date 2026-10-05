import { EditorSelection, EditorState } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { describe, expect, it } from "vitest";
import { buildLiveMarkerDecorations } from "./live-markers";

function stateFor(doc: string, caret?: number) {
  return EditorState.create({
    doc,
    selection: caret === undefined ? undefined : EditorSelection.cursor(caret),
    extensions: [markdown({ base: markdownLanguage })],
  });
}

// What each decoration does: "hide:<text>" for a hidden range, "bullet:<text>"
// for a marker drawn as a bullet, "indent:<width>" for a list item's widened
// indent, "line" for a line decoration.
function markers(doc: string, caret?: number, focused = true): string[] {
  const state = stateFor(doc, caret);
  const set = buildLiveMarkerDecorations(state, [{ from: 0, to: state.doc.length }], focused);
  const out: string[] = [];
  set.between(0, state.doc.length, (from, to, deco) => {
    if (from === to) out.push("line");
    else if (deco.spec.class === "cm-listIndent") out.push(`indent:${deco.spec.attributes.style}`);
    else out.push(`${deco.spec.widget ? "bullet" : "hide"}:${state.doc.sliceString(from, to)}`);
  });
  return out;
}

describe("buildLiveMarkerDecorations", () => {
  it("hides bold, italic, strikethrough and inline-code marks away from the caret", () => {
    const doc = "Some **bold**, _it_, ~~gone~~ and `code`.\n\nNext line";
    expect(markers(doc, doc.length)).toEqual([
      "hide:**", "hide:**", "hide:_", "hide:_", "hide:~~", "hide:~~", "hide:`", "hide:`",
    ]);
  });

  it("reveals an inline span's marks while the caret touches it", () => {
    const doc = "Some **bold** and ~~gone~~";
    expect(markers(doc, doc.indexOf("bold") + 2)).toEqual(["hide:~~", "hide:~~"]);
    // At the closing edge, just after typing the marks.
    expect(markers(doc, doc.length)).toEqual(["hide:**", "hide:**"]);
  });

  it("reveals heading and quote marks only on the caret's line", () => {
    const doc = "# Title\n\n> Quoted\n\nBody";
    expect(markers(doc, doc.length)).toEqual(["hide:# ", "line", "hide:> "]);
    expect(markers(doc, 3)).toEqual(["line", "hide:> "]);
    expect(markers(doc, doc.indexOf("Quoted"))).toEqual(["hide:# ", "line"]);
  });

  it("draws bullets for list dashes until the caret touches the marker", () => {
    const doc = "- one\n- two\n\nEnd";
    expect(markers(doc, doc.length)).toEqual(["bullet:-", "bullet:-"]);
    expect(markers(doc, 1)).toEqual(["bullet:-"]);
    // Caret in the item's text, past the marker: still a bullet.
    expect(markers(doc, doc.indexOf("two") + 2)).toEqual(["bullet:-", "bullet:-"]);
  });

  it("widens a nested item's indent whether or not the caret is on it", () => {
    const doc = "- one\n  - two\n1. first\n   1. second\n\t- tabbed\n\nEnd";
    const expected = ["indent:width: 1.5em", "indent:width: 2.25em", "indent:width: 3em"];
    expect(markers(doc, doc.length).filter((m) => m.startsWith("indent"))).toEqual(expected);
    expect(markers(doc, doc.indexOf("two")).filter((m) => m.startsWith("indent"))).toEqual(expected);
  });

  it("leaves a quoted list item's prefix alone", () => {
    const doc = "> - one\n>   - two\n\nEnd";
    expect(markers(doc, doc.length).some((m) => m.startsWith("indent"))).toBe(false);
  });

  it("leaves task items, ordered lists, callouts and code alone", () => {
    const doc = "- [ ] task\n1. first\n\n> [!note] Title\n> body\n\n```\n**not bold**\n```\n\nEnd";
    expect(markers(doc, doc.length)).toEqual([]);
  });

  it("leaves frontmatter alone", () => {
    const doc = "---\ntitle: **x**\n---\n\n**bold**";
    expect(markers(doc, 0, false)).toEqual(["hide:**", "hide:**"]);
  });

  it("hides every mark when the editor isn't focused", () => {
    const doc = "# Title **bold**";
    expect(markers(doc, 4, false)).toEqual(["hide:# ", "hide:**", "hide:**"]);
  });
});
