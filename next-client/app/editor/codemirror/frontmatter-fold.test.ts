import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { codeFolding } from "@codemirror/language";
import {
  findFrontmatterFoldRange,
  isFrontmatterFolded,
  toggleFrontmatterFold,
} from "./frontmatter-fold";

function makeView(doc: string) {
  return new EditorView({
    state: EditorState.create({ doc, extensions: [codeFolding()] }),
  });
}

describe("findFrontmatterFoldRange", () => {
  it("finds frontmatter at the start of the document", () => {
    const doc = "---\ntitle: Note\ntags: [work]\n---\nBody";
    const range = findFrontmatterFoldRange(doc);
    expect(range).not.toBeNull();
    expect(doc.slice(range!.bodyFrom, range!.bodyTo)).toBe("---\ntitle: Note\ntags: [work]\n---");
  });

  it("does not fold a later or unterminated delimiter", () => {
    expect(findFrontmatterFoldRange("Body\n---\ntitle: Note\n---")).toBeNull();
    expect(findFrontmatterFoldRange("---\ntitle: Note")).toBeNull();
  });
});

describe("frontmatter folding", () => {
  it("folds without changing the document", () => {
    const doc = "---\ntitle: Note\n---\nBody";
    const view = makeView(doc);
    const range = findFrontmatterFoldRange(doc)!;

    toggleFrontmatterFold(view, range, true);
    expect(isFrontmatterFolded(view.state, range)).toBe(true);
    expect(view.state.doc.toString()).toBe(doc);

    toggleFrontmatterFold(view, range, false);
    expect(isFrontmatterFolded(view.state, range)).toBe(false);
  });
});
