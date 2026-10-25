import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";
import {
  buildTagPillDecorations,
  collectTagMatches,
  selectionTouchesTag,
  tagPillClassName,
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

  it("rejects headings and malformed boundaries", () => {
    const tags = collectTagMatches("# Heading\n#project/subtag and #tag #not#this #mismatch");
    expect(tags.map((tag) => tag.text)).toEqual(["#project/subtag", "#tag", "#mismatch"]);
  });
});

describe("tagPillPlugin", () => {
  it("renders no pill inside a revealed frontmatter block, while body tags still render", () => {
    const doc = "---\ntags: [work, draft]\n---\nBody #later";
    const view = new EditorView({
      state: EditorState.create({
        doc,
        selection: EditorSelection.cursor(doc.indexOf("work")),
        extensions: [tagPillPlugin],
      }),
      parent: document.body,
    });
    expect(view.contentDOM).toHaveTextContent("tags: [work, draft]");
    const pills = Array.from(view.contentDOM.querySelectorAll(".cm-tag-pill")).map((node) => node.textContent);
    expect(pills).toEqual(["#later"]);
    view.destroy();
  });

  it("renders pills outside the active selection and keeps the pill's look around the raw text being edited", () => {
    const doc = "before #project/subtag after";
    const state = EditorState.create({
      doc,
      selection: EditorSelection.cursor(doc.indexOf("#project/subtag") + 2),
      extensions: [tagPillPlugin],
    });
    const view = new EditorView({ state, parent: document.body });

    const range = buildTagPillDecorations(view);
    const editing: string[] = [];
    range.between(0, doc.length, (from, to, deco) => {
      expect(deco.spec.widget).toBeUndefined();
      editing.push(`${doc.slice(from, to)} ${deco.spec.class}`);
    });
    expect(editing).toEqual([`#project/subtag ${tagPillClassName("custom")} cm-chip-editing`]);

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
    expect(matches.map((tag) => tag.kind)).toEqual(["workflow", "custom", "custom"]);
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

  it("finds every tag in pasted list content", () => {
    const doc = `- [ ] Saving creates a new file
- Currency is shown "highlighted" only for $100 dollars, and only at the start of the line; #todo
there are other highlighting issues, wikilinks, #todo not showed differently than another #tag`;
    expect(collectTagMatches(doc).map((tag) => tag.text)).toEqual(["#todo", "#todo", "#tag"]);
  });
});
