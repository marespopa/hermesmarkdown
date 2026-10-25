import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { frontmatterRangeOf, frontmatterSpacer, insertOrRevealFrontmatter } from "./frontmatter-block";

function makeView(doc: string) {
  return new EditorView({
    state: EditorState.create({ doc, extensions: frontmatterSpacer }),
  });
}

const rangeOf = (doc: string) => frontmatterRangeOf(EditorState.create({ doc }).doc);

describe("frontmatterRangeOf", () => {
  it("finds frontmatter at the start of the document", () => {
    const doc = "---\ntitle: Note\ntags: [work]\n---\nBody";
    expect(doc.slice(0, rangeOf(doc)!.closeTo)).toBe("---\ntitle: Note\ntags: [work]\n---");
  });

  it("ignores a later or unterminated delimiter", () => {
    expect(rangeOf("Body\n---\ntitle: Note\n---")).toBeNull();
    expect(rangeOf("---\ntitle: Note")).toBeNull();
    expect(rangeOf("")).toBeNull();
  });
});

describe("frontmatter block", () => {
  it("shows every YAML line as typed", () => {
    const view = makeView("---\ntitle: Note\nstatus: draft\n---\n\n# Heading");
    expect(view.contentDOM.textContent).toBe("---title: Notestatus: draft---# Heading");
  });

  it("adds a spacer block only before text that directly follows the block", () => {
    const tight = makeView("---\ntitle: Note\n---\nBody");
    expect(tight.contentDOM.querySelectorAll(".cm-frontmatter-spacer")).toHaveLength(1);
    expect(makeView("---\ntitle: Note\n---\n\nBody").contentDOM.querySelector(".cm-frontmatter-spacer")).toBeNull();
  });
});

describe("insertOrRevealFrontmatter", () => {
  it("puts the caret on the title line of existing frontmatter", () => {
    const doc = "---\ntitle: Note\n---\nBody";
    const view = makeView(doc);
    insertOrRevealFrontmatter(view);
    expect(view.state.selection.main.head).toBe("---\ntitle: Note".length);
    expect(view.state.doc.toString()).toBe(doc);
  });

  it("inserts a starter block with the caret after `title: `", () => {
    const view = makeView("Body");
    insertOrRevealFrontmatter(view);
    expect(view.state.doc.toString()).toBe("---\ntitle: \ntags: []\n---\n\nBody");
    expect(view.state.selection.main.head).toBe("---\ntitle: ".length);
  });
});
