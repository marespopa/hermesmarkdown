import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  findFrontmatterFoldRange,
  frontmatterFoldRangeOf,
  frontmatterCollapse,
  frontmatterRowLabel,
  frontmatterRowSummary,
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

  it("replaces the frontmatter and following blank lines with one summary row", () => {
    const doc = "---\ntitle: Note\n---\n\n# Heading";
    const view = makeView(doc);

    toggleFrontmatterFold(view, findFrontmatterFoldRange(doc)!, true);
    expect(view.contentDOM.textContent).toBe("Properties· Note# Heading");
  });

  it("adds a spacer block before text that directly follows expanded frontmatter", () => {
    const tight = makeView("---\ntitle: Note\n---\nBody");
    expect(tight.contentDOM.querySelectorAll(".cm-frontmatter-spacer")).toHaveLength(1);

    // A blank line already gives the room; collapsed frontmatter has its row.
    expect(makeView("---\ntitle: Note\n---\n\nBody").contentDOM.querySelector(".cm-frontmatter-spacer")).toBeNull();
    toggleFrontmatterFold(tight, findFrontmatterFoldRange(tight.state.doc.toString())!, true);
    expect(tight.contentDOM.querySelector(".cm-frontmatter-spacer")).toBeNull();
  });

  it("expands from a click on the summary row", () => {
    const doc = "---\ntitle: Note\n---\n# Heading";
    const view = makeView(doc);
    toggleFrontmatterFold(view, findFrontmatterFoldRange(doc)!, true);

    view.contentDOM.querySelector<HTMLButtonElement>(".cm-frontmatter-summary")!.click();
    expect(isFrontmatterFolded(view.state)).toBe(false);
  });

  it("collapses from the same header row once expanded", () => {
    const view = makeView("---\ntitle: Note\n---\n# Heading");
    const header = view.contentDOM.querySelector<HTMLButtonElement>(".cm-frontmatter-summary")!;
    expect(header.getAttribute("aria-expanded")).toBe("true");
    expect(header.getAttribute("aria-label")).toBe("Hide properties");

    header.click();
    expect(isFrontmatterFolded(view.state)).toBe(true);
    expect(view.contentDOM.querySelector(".cm-frontmatter-summary")!.getAttribute("aria-expanded")).toBe("false");
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

describe("frontmatter summary", () => {
  it("shows only the title and tags", () => {
    const doc = "---\ntitle: \"Release plan\"\nstatus: draft\ntags: [work, \"ideas\", #x, y]\ncreated: 2026-10-09\n---\nBody";
    const summary = frontmatterRowSummary(doc);
    expect(summary).toEqual({ title: "Release plan", tags: ["work", "ideas", "x"], moreTags: 1 });
    expect(frontmatterRowLabel(summary)).toBe("Release plan, #work, #ideas, #x, +1");
  });

  it("reads block-list tags and shows nothing for an empty title or tags", () => {
    expect(frontmatterRowSummary("---\ntags:\n  - a\n  - b\n---\n")).toEqual({
      title: null, tags: ["a", "b"], moreTags: 0,
    });
    const empty = frontmatterRowSummary("---\ntitle: \ntags: []\nstatus: draft\n---\n");
    expect(empty).toEqual({ title: null, tags: [], moreTags: 0 });
    expect(frontmatterRowLabel(empty)).toBe("");
  });
});

describe("frontmatterFoldRangeOf", () => {
  it("matches findFrontmatterFoldRange on the editor's document", () => {
    for (const doc of [
      "---\ntitle: Note\n---\nBody",
      "---\ntitle: Note\n---\n\n\nBody after blanks",
      "---\ntitle: Note\n---",
      "---\nunclosed: true\nBody",
      "No frontmatter\n---\nhere",
      "---\n---",
      "",
    ]) {
      expect(frontmatterFoldRangeOf(EditorState.create({ doc }).doc)).toEqual(findFrontmatterFoldRange(doc));
    }
  });
});
