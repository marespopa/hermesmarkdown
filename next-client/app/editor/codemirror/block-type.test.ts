import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import { blockTypeAt, parseBlockLine, setBlockType } from "./block-type";

let view: EditorView | null = null;

function makeView(doc: string, selection: EditorSelection = EditorSelection.single(0)) {
  view = new EditorView({ state: EditorState.create({ doc, selection }), parent: document.body });
  return view;
}

afterEach(() => {
  view?.destroy();
  view = null;
});

describe("parseBlockLine", () => {
  it.each([
    ["Plain text", "text"],
    ["## Section", "h2"],
    ["###### Deep", "h6"],
    ["> Quoted", "quote"],
    ["- item", "bullet"],
    ["  * nested", "bullet"],
    ["- [ ] task", "todo"],
    ["- [x] done", "todo"],
    ["3. third", "numbered"],
    ["#tag is not a heading", "text"],
    ["*emphasis* is not a bullet", "text"],
    ["---", "text"],
  ])("reads %j as %s", (text, type) => {
    expect(parseBlockLine(text).type).toBe(type);
  });
});

describe("setBlockType", () => {
  it("turns text into a heading and back, keeping the caret in the text", () => {
    const v = makeView("Plan", EditorSelection.single(2));
    setBlockType("h1")(v);
    expect(v.state.doc.toString()).toBe("# Plan");
    expect(v.state.selection.main.head).toBe(4);
    expect(blockTypeAt(v.state)).toBe("h1");

    setBlockType("text")(v);
    expect(v.state.doc.toString()).toBe("Plan");
  });

  it("swaps one marker for another", () => {
    const v = makeView("- [x] Ship it", EditorSelection.single(8));
    setBlockType("quote")(v);
    expect(v.state.doc.toString()).toBe("> Ship it");
  });

  it("numbers selected lines from 1 and keeps list nesting", () => {
    const v = makeView("one\n  - two\nthree", EditorSelection.single(0, 17));
    setBlockType("numbered")(v);
    expect(v.state.doc.toString()).toBe("1. one\n  2. two\n3. three");
  });

  it("turns lines into to-dos and leaves lines already of that type alone", () => {
    const v = makeView("- [x] done\nnext", EditorSelection.single(0, 15));
    setBlockType("todo")(v);
    expect(v.state.doc.toString()).toBe("- [x] done\n- [ ] next");
  });
});
