import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { computeLineShapes } from "./line-numbers";

// Line number → gutter class, for the lines that get one.
function shapesOf(doc: string) {
  const state = EditorState.create({ doc });
  const shapes: Record<number, string> = {};
  const iter = computeLineShapes(state).iter();
  for (; iter.value; iter.next()) {
    shapes[state.doc.lineAt(iter.from).number] = iter.value.elementClass;
  }
  return shapes;
}

describe("computeLineShapes", () => {
  it("marks headings by level, and a heading on the first line as first", () => {
    expect(shapesOf("# Title\n\nText\n\n## Section\n###### Small")).toEqual({
      1: "cm-gutter-heading-1 cm-gutter-first",
      5: "cm-gutter-heading-2",
      6: "cm-gutter-heading-6",
    });
  });

  it("marks fenced code, and doesn't read # inside it as a heading", () => {
    expect(shapesOf("Text\n```sh\n# comment\n```\n# After")).toEqual({
      2: "cm-gutter-codeblock-start",
      3: "cm-gutter-codeblock",
      4: "cm-gutter-codeblock",
      5: "cm-gutter-heading-1",
    });
  });

  it("skips YAML comments in frontmatter", () => {
    expect(shapesOf("---\n# hint\ntitle: x\n---\n# Title")).toEqual({
      5: "cm-gutter-heading-1",
    });
  });

  it("needs a space after the hashes, like a heading", () => {
    expect(shapesOf("#tag\n####### seven")).toEqual({});
  });
});
