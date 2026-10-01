import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  findFrontmatterFoldRange,
  frontmatterCollapse,
  isFrontmatterFolded,
  toggleFrontmatterFold,
} from "./frontmatter-fold";

function makeView(doc: string) {
  return new EditorView({
    state: EditorState.create({ doc, extensions: frontmatterCollapse }),
  });
}

describe("findFrontmatterFoldRange", () => {
  it("finds frontmatter at the start of the document", () => {
    const doc = "---\ntitle: Note\ntags: [work]\n---\nBody";
    const range = findFrontmatterFoldRange(doc);
    expect(range).not.toBeNull();
    expect(doc.slice(range!.bodyFrom, range!.closeTo)).toBe("---\ntitle: Note\ntags: [work]\n---");
    expect(doc.slice(range!.bodyFrom, range!.bodyTo)).toBe("---\ntitle: Note\ntags: [work]\n---");
  });

  it("extends the fold over blank lines up to the first content line", () => {
    const doc = "---\ntitle: Note\n---\n\n  \n# Heading\nBody";
    const range = findFrontmatterFoldRange(doc)!;
    expect(doc.slice(range.bodyTo)).toBe("\n# Heading\nBody");
    expect(doc.slice(0, range.closeTo)).toBe("---\ntitle: Note\n---");
  });

  it("ends the fold at the closing delimiter when no content follows", () => {
    const doc = "---\ntitle: Note\n---\n\n";
    const range = findFrontmatterFoldRange(doc)!;
    expect(range.bodyTo).toBe(range.closeTo);
    expect(doc.slice(0, range.bodyTo)).toBe("---\ntitle: Note\n---");
  });

  it("does not fold a later or unterminated delimiter", () => {
    expect(findFrontmatterFoldRange("Body\n---\ntitle: Note\n---")).toBeNull();
    expect(findFrontmatterFoldRange("---\ntitle: Note")).toBeNull();
  });
});

describe("frontmatter collapsing", () => {
  it("collapses without changing the document", () => {
    const doc = "---\ntitle: Note\n---\nBody";
    const view = makeView(doc);
    const range = findFrontmatterFoldRange(doc)!;

    toggleFrontmatterFold(view, range, true);
    expect(isFrontmatterFolded(view.state)).toBe(true);
    expect(view.state.doc.toString()).toBe(doc);

    toggleFrontmatterFold(view, range, false);
    expect(isFrontmatterFolded(view.state)).toBe(false);
  });

  it("parks the caret on the first visible line when collapsing", () => {
    const doc = "---\ntitle: Note\n---\n\n# Heading";
    const view = makeView(doc);

    toggleFrontmatterFold(view, findFrontmatterFoldRange(doc)!, true);
    expect(view.state.selection.main.head).toBe(doc.indexOf("# Heading"));
  });

  it("hides the frontmatter and following blank lines as one block", () => {
    const doc = "---\ntitle: Note\n---\n\n# Heading";
    const view = makeView(doc);

    toggleFrontmatterFold(view, findFrontmatterFoldRange(doc)!, true);
    expect(view.contentDOM.textContent).toBe("# Heading");
  });

  it("expands when the caret moves into the hidden block", () => {
    const doc = "---\ntitle: Note\n---\nBody";
    const view = makeView(doc);
    toggleFrontmatterFold(view, findFrontmatterFoldRange(doc)!, true);

    view.dispatch({ selection: { anchor: 0 } });
    expect(isFrontmatterFolded(view.state)).toBe(false);
  });

  it("expands when a user edit touches the hidden block", () => {
    const doc = "---\ntitle: Note\n---\nBody";
    const view = makeView(doc);
    const range = findFrontmatterFoldRange(doc)!;
    toggleFrontmatterFold(view, range, true);

    view.dispatch({
      changes: { from: range.bodyTo, to: range.bodyTo + 1 },
      userEvent: "delete.backward",
    });
    expect(isFrontmatterFolded(view.state)).toBe(false);
  });

  it("stays collapsed while typing below it", () => {
    const doc = "---\ntitle: Note\n---\nBody";
    const view = makeView(doc);
    toggleFrontmatterFold(view, findFrontmatterFoldRange(doc)!, true);

    view.dispatch({
      changes: { from: doc.length, insert: "!" },
      selection: { anchor: doc.length + 1 },
      userEvent: "input.type",
    });
    expect(isFrontmatterFolded(view.state)).toBe(true);
  });
});
