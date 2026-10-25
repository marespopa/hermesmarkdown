import { afterEach, describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { foldedRanges } from "@codemirror/language";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import {
  foldCurrentSection,
  headingFoldKeys,
  headingFolding,
  headingSectionAt,
  restoreHeadingFolds,
  sectionAround,
  toggleHeadingFold,
  unfoldAllSections,
} from "./heading-fold";
import { toggleCalloutFold } from "./callout-fold";

const views: EditorView[] = [];
afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
});

function makeView(doc: string, caret = 0) {
  const view = new EditorView({
    state: EditorState.create({
      doc,
      selection: { anchor: caret },
      extensions: [markdown({ base: markdownLanguage }), headingFolding],
    }),
    parent: document.body,
  });
  views.push(view);
  return view;
}

const stateOf = (doc: string) => EditorState.create({ doc, extensions: markdown({ base: markdownLanguage }) });
const lineFrom = (doc: string, text: string) => doc.indexOf(text);
const folds = (view: EditorView) => {
  const ranges: string[] = [];
  foldedRanges(view.state).between(0, view.state.doc.length, (from, to) => {
    ranges.push(view.state.sliceDoc(from, to));
  });
  return ranges;
};

const NOTE = [
  "# Plan",
  "Intro",
  "",
  "## Goals",
  "- ship",
  "",
  "### Detail",
  "text",
  "",
  "## Risks",
  "none",
  "",
  "# Next",
  "later",
].join("\n");

describe("headingSectionAt", () => {
  it("runs to the next heading of the same or a higher level, keeping blank lines before it", () => {
    const state = stateOf(NOTE);
    const goals = headingSectionAt(state, lineFrom(NOTE, "## Goals"))!;
    expect(state.sliceDoc(goals.from, goals.to)).toBe("\n- ship\n\n### Detail\ntext");
    const plan = headingSectionAt(state, 0)!;
    expect(state.sliceDoc(plan.to - 4, plan.to)).toBe("none");
  });

  it("runs to the end of the note for the last heading", () => {
    const state = stateOf(NOTE);
    const next = headingSectionAt(state, lineFrom(NOTE, "# Next"))!;
    expect(state.sliceDoc(next.from, next.to)).toBe("\nlater");
  });

  it("has nothing to fold for an empty section or a non-heading line", () => {
    const doc = "## Empty\n\n## Full\ntext";
    expect(headingSectionAt(stateOf(doc), 0)).toBeNull();
    expect(headingSectionAt(stateOf(doc), lineFrom(doc, "text"))).toBeNull();
  });

  it("skips `#` lines in code, quotes and frontmatter", () => {
    const doc = "---\n# yaml comment\ntitle: x\n---\n```\n# code\n```\n> # quoted\n> text\n# Real\nbody";
    const state = stateOf(doc);
    expect(headingSectionAt(state, lineFrom(doc, "# yaml"))).toBeNull();
    expect(headingSectionAt(state, lineFrom(doc, "# code"))).toBeNull();
    expect(headingSectionAt(state, lineFrom(doc, "> # quoted"))).toBeNull();
    expect(headingSectionAt(state, lineFrom(doc, "# Real"))).not.toBeNull();
  });

  it("treats every level from # to ###### as a heading", () => {
    for (let level = 1; level <= 6; level++) {
      const doc = `${"#".repeat(level)} Title\nbody`;
      expect(headingSectionAt(stateOf(doc), 0)?.level).toBe(level);
    }
  });
});

describe("sectionAround", () => {
  it("finds the nearest heading above the caret", () => {
    const state = stateOf(NOTE);
    expect(sectionAround(state, lineFrom(NOTE, "text"))!.headingFrom).toBe(lineFrom(NOTE, "### Detail"));
    expect(sectionAround(state, lineFrom(NOTE, "none"))!.headingFrom).toBe(lineFrom(NOTE, "## Risks"));
    expect(sectionAround(state, lineFrom(NOTE, "## Goals"))!.headingFrom).toBe(lineFrom(NOTE, "## Goals"));
  });

  it("finds nothing above the first heading", () => {
    expect(sectionAround(stateOf("intro\n# Title\nbody"), 0)).toBeNull();
  });
});

describe("folding", () => {
  it("folds and unfolds a heading's section without changing the text", () => {
    const view = makeView(NOTE);
    toggleHeadingFold(view, lineFrom(NOTE, "## Goals"));
    expect(folds(view)).toEqual(["\n- ship\n\n### Detail\ntext"]);
    expect(view.state.doc.toString()).toBe(NOTE);
    toggleHeadingFold(view, lineFrom(NOTE, "## Goals"));
    expect(folds(view)).toEqual([]);
  });

  it("folds the caret's section and parks the caret at the end of its heading", () => {
    const view = makeView(NOTE, lineFrom(NOTE, "- ship") + 2);
    expect(foldCurrentSection(view)).toBe(true);
    expect(folds(view)).toEqual(["\n- ship\n\n### Detail\ntext"]);
    expect(view.state.selection.main.head).toBe(lineFrom(NOTE, "## Goals") + "## Goals".length);
    // Again: unfolds it.
    foldCurrentSection(view);
    expect(folds(view)).toEqual([]);
  });

  it("shows a chevron on foldable headings and a `…` after a folded one", () => {
    const view = makeView(NOTE);
    expect(view.contentDOM.querySelectorAll(".cm-headingFold")).toHaveLength(5);
    toggleHeadingFold(view, lineFrom(NOTE, "# Next"));
    const chevron = view.contentDOM.querySelectorAll<HTMLElement>(".cm-headingFold")[4];
    expect(chevron.getAttribute("aria-expanded")).toBe("false");
    expect(view.contentDOM.querySelector(".cm-headingFoldPlaceholder")).not.toBeNull();
  });

  it("toggles from a click on the chevron", () => {
    const view = makeView(NOTE);
    const chevron = () => view.contentDOM.querySelector<HTMLElement>(".cm-headingFold")!;
    chevron().click();
    expect(folds(view)).toHaveLength(1);
    chevron().click();
    expect(folds(view)).toEqual([]);
  });

  it("unfolds every heading but leaves a folded callout folded", () => {
    const doc = "# A\none\n\n> [!note] Title\n> body\n\n# B\ntwo";
    const view = makeView(doc);
    toggleHeadingFold(view, lineFrom(doc, "# B"));
    toggleCalloutFold(view, lineFrom(doc, "> [!note] Title") + "> [!note] Title".length, doc.indexOf("> body") + "> body".length, true);
    expect(folds(view)).toEqual(["\n> body", "\ntwo"]);
    unfoldAllSections(view);
    expect(folds(view)).toEqual(["\n> body"]);
  });
});

describe("frontmatter folding", () => {
  const DOC = "---\ntitle: Note\ntags: [a]\n---\n\n# Title\nbody";

  it("folds the whole block, opening `---` included, from its chevron", () => {
    const view = makeView(DOC);
    const chevron = () => view.contentDOM.querySelector<HTMLElement>(".cm-frontmatterFold")!;
    expect(chevron().getAttribute("aria-label")).toBe("Fold frontmatter");
    chevron().click();
    expect(folds(view)).toEqual(["---\ntitle: Note\ntags: [a]\n---"]);
    expect(chevron().getAttribute("aria-expanded")).toBe("false");
    chevron().click();
    expect(folds(view)).toEqual([]);
  });

  it("folds from the shortcut with the caret inside, parking it at the top of the note", () => {
    const view = makeView(DOC, DOC.indexOf("Note"));
    foldCurrentSection(view);
    expect(folds(view)).toEqual(["---\ntitle: Note\ntags: [a]\n---"]);
    expect(view.state.selection.main.head).toBe(0);
  });

  it("shows the title and a tag cloud in place of the block", () => {
    const doc = "---\ntitle: \"Release plan\"\nstatus: draft\ntags: [work, ideas, x, y]\n---\nBody";
    const view = makeView(doc);
    toggleHeadingFold(view, 0);
    const placeholder = view.contentDOM.querySelector(".cm-frontmatterFoldPlaceholder")!;
    expect(placeholder.textContent).toBe("Release plan #work #ideas #x #y");
    expect(placeholder.querySelectorAll(".cm-tag-pill")).toHaveLength(4);

    const tagsOnly = makeView("---\ntags: [work]\n---\nBody");
    toggleHeadingFold(tagsOnly, 0);
    expect(tagsOnly.contentDOM.querySelector(".cm-frontmatterFoldPlaceholder")!.textContent).toBe("#work");

    const bare = makeView("---\nstatus: draft\n---\nBody");
    toggleHeadingFold(bare, 0);
    expect(bare.contentDOM.querySelector(".cm-frontmatterFoldPlaceholder")!.textContent).toBe("Frontmatter");
  });

  it("keeps its chevron while folded, to unfold it again", () => {
    const view = makeView(DOC);
    toggleHeadingFold(view, 0);
    const chevron = view.contentDOM.querySelector<HTMLElement>(".cm-frontmatterFold");
    expect(chevron?.getAttribute("aria-expanded")).toBe("false");
    chevron!.click();
    expect(folds(view)).toEqual([]);
  });

  it("unfolds with Unfold All and comes back for the visit", () => {
    const view = makeView(DOC);
    toggleHeadingFold(view, 0);
    expect(headingFoldKeys(view.state)).toEqual(["---"]);
    const reopened = makeView(DOC);
    restoreHeadingFolds(reopened, ["---"]);
    expect(folds(reopened)).toHaveLength(1);
    unfoldAllSections(reopened);
    expect(folds(reopened)).toEqual([]);
  });
});

describe("headingFoldKeys / restoreHeadingFolds", () => {
  it("restores the same folded headings in a new editor", () => {
    const view = makeView(NOTE);
    toggleHeadingFold(view, lineFrom(NOTE, "### Detail"));
    toggleHeadingFold(view, lineFrom(NOTE, "## Risks"));
    const keys = headingFoldKeys(view.state);
    expect(keys).toEqual(["### Detail", "## Risks"]);

    const reopened = makeView(NOTE);
    restoreHeadingFolds(reopened, keys);
    expect(folds(reopened)).toEqual(["\ntext", "\nnone"]);
  });

  it("folds only as many same-named headings as were folded", () => {
    const doc = "## Notes\na\n\n## Notes\nb";
    const view = makeView(doc);
    restoreHeadingFolds(view, ["## Notes"]);
    expect(folds(view)).toEqual(["\na"]);
  });
});
