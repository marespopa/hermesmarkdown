import { EditorSelection, EditorState, Text } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import { fencedBlockAt, setHeading, toggleCodeBlock, wrapAsLink } from "./format-shortcuts";

let view: EditorView | null = null;

function makeView(doc: string, selection: EditorSelection = EditorSelection.single(0)) {
  view = new EditorView({ state: EditorState.create({ doc, selection }), parent: document.body });
  return view;
}

afterEach(() => {
  view?.destroy();
  view = null;
});

describe("setHeading", () => {
  it("turns the caret's line into a heading and keeps the caret in its text", () => {
    const v = makeView("Plan the week", EditorSelection.single(5));
    setHeading(2)(v);
    expect(v.state.doc.toString()).toBe("## Plan the week");
    expect(v.state.selection.main.head).toBe(8);
  });

  it("changes the level of an existing heading", () => {
    const v = makeView("### Notes", EditorSelection.single(6));
    setHeading(1)(v);
    expect(v.state.doc.toString()).toBe("# Notes");
  });

  it("removes the heading when the line already has that level", () => {
    const v = makeView("## Notes", EditorSelection.single(5));
    setHeading(2)(v);
    expect(v.state.doc.toString()).toBe("Notes");
  });

  it("moves the caret past the new marker on an empty line", () => {
    const v = makeView("");
    setHeading(3)(v);
    expect(v.state.doc.toString()).toBe("### ");
    expect(v.state.selection.main.head).toBe(4);
  });

  it("applies to every line a selection touches", () => {
    const v = makeView("One\n# Two\nThree", EditorSelection.single(0, 14));
    setHeading(1)(v);
    expect(v.state.doc.toString()).toBe("# One\n# Two\n# Three");
  });
});

describe("wrapAsLink", () => {
  it("wraps the selection and puts the caret between the parens", () => {
    const v = makeView("see docs here", EditorSelection.single(4, 8));
    wrapAsLink(v);
    expect(v.state.doc.toString()).toBe("see [docs]() here");
    expect(v.state.selection.main.head).toBe(11);
  });

  it("puts the caret between the brackets when nothing is selected", () => {
    const v = makeView("see ", EditorSelection.single(4));
    wrapAsLink(v);
    expect(v.state.doc.toString()).toBe("see []()");
    expect(v.state.selection.main.head).toBe(5);
  });
});

describe("fencedBlockAt", () => {
  const doc = Text.of(["intro", "```js", "code", "```", "outro", "```", "unclosed"]);

  it("finds the block around a line, fences included", () => {
    expect(fencedBlockAt(doc, 2)).toEqual({ open: 2, close: 4 });
    expect(fencedBlockAt(doc, 3)).toEqual({ open: 2, close: 4 });
    expect(fencedBlockAt(doc, 4)).toEqual({ open: 2, close: 4 });
  });

  it("returns null outside a block or in an unclosed one", () => {
    expect(fencedBlockAt(doc, 1)).toBeNull();
    expect(fencedBlockAt(doc, 5)).toBeNull();
    expect(fencedBlockAt(doc, 7)).toBeNull();
  });
});

describe("toggleCodeBlock", () => {
  it("wraps the selected lines with the caret after the opening fence", () => {
    const v = makeView("a\nb\nc", EditorSelection.single(2, 5));
    toggleCodeBlock(v);
    expect(v.state.doc.toString()).toBe("a\n```\nb\nc\n```");
    expect(v.state.selection.main.head).toBe(5);
  });

  it("puts the caret inside a new block on an empty line", () => {
    const v = makeView("");
    toggleCodeBlock(v);
    expect(v.state.doc.toString()).toBe("```\n\n```");
    expect(v.state.selection.main.head).toBe(4);
  });

  it("removes the fences when the caret is inside a block", () => {
    const v = makeView("a\n```js\ncode\n```\nb", EditorSelection.single(9));
    toggleCodeBlock(v);
    expect(v.state.doc.toString()).toBe("a\ncode\nb");
  });

  it("removes an empty block entirely", () => {
    const v = makeView("```\n```", EditorSelection.single(0));
    toggleCodeBlock(v);
    expect(v.state.doc.toString()).toBe("");
  });
});
