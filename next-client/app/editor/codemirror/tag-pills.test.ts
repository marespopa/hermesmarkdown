import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";
import {
  buildTagPillDecorations,
  collectFrontmatterTagLists,
  collectTagMatches,
  selectionTouchesTag,
  tagPillPlugin,
} from "./tag-pills";

describe("collectTagMatches", () => {
  it("matches plain, nested, and hyphenated tags", () => {
    const tags = collectTagMatches("alpha #project/subtag #team-alpha #draft");
    expect(tags.map((tag) => tag.text)).toEqual(["#project/subtag", "#team-alpha", "#draft"]);
  });

  it("matches frontmatter tag arrays as pills too", () => {
    const tags = collectTagMatches("---\ntitle: Note\ntags: [tag1, project/subtag, draft]\n---\n#tag1");
    expect(tags.map((tag) => tag.text)).toEqual(["#tag1", "#project/subtag", "#draft", "#tag1"]);
  });

  it("groups an inline frontmatter list without its YAML punctuation", () => {
    const doc = "---\ntags: [tag1, project/subtag, draft]\n---\nBody";
    const view = new EditorView({
      state: EditorState.create({
        doc,
        selection: EditorSelection.cursor(doc.indexOf("Body")),
        extensions: [tagPillPlugin],
      }),
      parent: document.body,
    });

    const group = view.dom.querySelector(".cm-frontmatter-tag-list");
    expect(group).toHaveTextContent("#tag1#project/subtag#draft");
    expect(group?.textContent).not.toContain("[");
    expect(group?.textContent).not.toContain("]");
    expect(group?.textContent).not.toContain(",");
    expect(group?.querySelectorAll(".cm-tag-pill")).toHaveLength(3);

    view.dispatch({ selection: EditorSelection.cursor(doc.indexOf("tag1")) });
    expect(view.dom.querySelector(".cm-frontmatter-tag-list")).toBeNull();
    expect(view.contentDOM).toHaveTextContent("[tag1, project/subtag, draft]");
    view.destroy();
  });

  it("renders an empty frontmatter array as a quiet empty state", () => {
    const doc = "---\ntags: []\n---\nBody";
    const lists = collectFrontmatterTagLists(doc);
    expect(lists).toEqual([expect.objectContaining({ tags: [] })]);

    const view = new EditorView({
      state: EditorState.create({
        doc,
        selection: EditorSelection.cursor(doc.indexOf("Body")),
        extensions: [tagPillPlugin],
      }),
      parent: document.body,
    });
    expect(view.dom.querySelector(".cm-frontmatter-tag-list-empty")).toHaveTextContent("No tags");
    view.destroy();
  });

  it("rejects headings and malformed boundaries", () => {
    const tags = collectTagMatches("# Heading\n#project/subtag and #tag #not#this #mismatch");
    expect(tags.map((tag) => tag.text)).toEqual(["#project/subtag", "#tag", "#mismatch"]);
  });
});

describe("tagPillPlugin", () => {
  it("renders pills outside the active selection and reveals the raw text when the cursor is inside a tag", () => {
    const doc = "before #project/subtag after";
    const state = EditorState.create({
      doc,
      selection: EditorSelection.cursor(doc.indexOf("#project/subtag") + 2),
      extensions: [tagPillPlugin],
    });
    const view = new EditorView({ state, parent: document.body });

    const range = buildTagPillDecorations(view);
    expect(range.size).toBe(0);

    view.dispatch({
      selection: EditorSelection.cursor(doc.indexOf("after")),
      userEvent: "select.tag-pill",
    });
    const active = buildTagPillDecorations(view);
    expect(active.size).toBeGreaterThan(0);

    view.destroy();
  });

  it("keeps workflow and todo tags semantic by kind", () => {
    const doc = "#draft #todo #custom";
    const cursorPos = doc.indexOf("#custom") - 1;
    const view = new EditorView({
      state: EditorState.create({ doc, selection: EditorSelection.cursor(cursorPos) }),
      parent: document.body,
    });
    const matches = collectTagMatches(doc);
    expect(matches.map((tag) => tag.kind)).toEqual(["workflow", "todo", "custom"]);
    const pills = buildTagPillDecorations(view);
    expect(pills.size).toBeGreaterThan(0);
    view.destroy();
  });

  it("touches selection ranges without leaving a stale hidden widget behind", () => {
    const text = "#project/subtag";
    const selection = EditorSelection.create([
      EditorSelection.range(0, 0),
      EditorSelection.range(text.indexOf("tag"), text.indexOf("tag") + 3),
    ]);
    expect(selectionTouchesTag(selection, 0, text.length)).toBe(true);
  });
});
