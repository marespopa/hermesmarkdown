import { EditorSelection, EditorState } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { describe, expect, it } from "vitest";
import { buildLiveMarkerDecorations } from "./live-markers";

function stateFor(doc: string, caret?: number) {
  return EditorState.create({
    doc,
    selection: caret === undefined ? undefined : EditorSelection.cursor(caret),
    extensions: [markdown({ base: markdownLanguage })],
  });
}

// What each decoration does: "list:<text>" for a list marker,
// "indent:<spaces>" for a nested item's letter-wide leading spaces,
// "task:<text>:<state>" for a task's marker, "margin:<text>" for marks hung in the margin, "strut" for a
// marks-only row, "gap" for a blank line in a list, "line" for any other line
// decoration. Anything else would be a mark this file hides: "hide:<text>".
function markers(doc: string, caret?: number): string[] {
  const state = stateFor(doc, caret);
  const set = buildLiveMarkerDecorations(state, [{ from: 0, to: state.doc.length }]);
  const out: string[] = [];
  set.between(0, state.doc.length, (from, to, deco) => {
    const text = state.doc.sliceString(from, to);
    const cls = deco.spec.class;
    if (cls === "cm-listGap") out.push("gap");
    else if (cls === "cm-marginOnly") out.push("strut");
    else if (from === to) out.push("line");
    else if (cls?.endsWith("cm-listTask")) out.push(`task:${text}:${deco.spec.attributes["data-state"]}`);
    else if (cls === "cm-listMarker") out.push(`list:${text}`);
    else if (cls === "cm-listIndent") out.push(`indent:${JSON.stringify(text)}`);
    else if (cls === "cm-marginMarks") out.push(`margin:${text}`);
    else out.push(`hide:${text}`);
  });
  return out;
}

describe("buildLiveMarkerDecorations", () => {
  it("leaves bold, italic, strikethrough and inline-code marks as typed, wherever the caret is", () => {
    const doc = "Some **bold**, _it_, ~~gone~~ and `code`.\n\nNext line";
    expect(markers(doc, doc.length)).toEqual([]);
    expect(markers(doc, doc.indexOf("bold") + 2)).toEqual([]);
  });

  it("hangs heading and quote marks in the margin on every line", () => {
    const doc = "# Title\n\n> Quoted\n\nBody";
    const expected = ["margin:# ", "line", "margin:> "];
    expect(markers(doc, doc.length)).toEqual(expected);
    expect(markers(doc, 3)).toEqual(expected);
  });

  it("props up a row that holds only margin marks", () => {
    expect(markers("## \n\n> \n\nBody", 0)).toEqual(["strut", "margin:## ", "strut", "line", "margin:> "]);
    expect(markers("## Title", 3)).toEqual(["margin:## "]);
  });

  it("treats a nested quote's marks as one run", () => {
    expect(markers("> > deep\n\nEnd")).toEqual(["line", "margin:> > "]);
  });

  it("shows a callout's syntax as typed, its `>`s in the margin", () => {
    const doc = "> [!note] Title\n> body\n\nEnd";
    expect(markers(doc, doc.length)).toEqual(["margin:> ", "margin:> "]);
    expect(markers(doc, 0)).toEqual(["margin:> ", "margin:> "]);
  });

  it("keeps list markers inline as typed, wherever the caret is", () => {
    const doc = "- one\n1. first\n10. tenth\n\nEnd";
    const expected = ["list:- ", "list:1. ", "list:10. "];
    expect(markers(doc, doc.length)).toEqual(expected);
    expect(markers(doc, 1)).toEqual(expected);
  });

  it("keeps a task's marker as typed, tinted by its status", () => {
    const doc = "- [ ] open\n- [x] done\n- [/] going\n- [!] paused\n\nEnd";
    const tasks = ["task:- [ ] :open", "task:- [x] :done", "task:- [/] :progress", "task:- [!] :hold"];
    expect(markers(doc, doc.length)).toEqual(tasks);
    expect(markers(doc, 3)).toEqual(tasks);
  });

  it("treats a numbered task like a bulleted one", () => {
    const doc = "1. [ ] open\n2. [/] going\n\nEnd";
    expect(markers(doc)).toEqual(["task:1. [ ] :open", "task:2. [/] :progress"]);
  });

  it("sets a nested item's own spaces letter-wide, adding none", () => {
    const doc = "- one\n  - two\n1. first\n   1. second\n\t- tabbed\n\nEnd";
    expect(markers(doc, doc.length)).toEqual([
      "list:- ", 'indent:"  "', "list:- ", "list:1. ", 'indent:"   "', "list:1. ", 'indent:"\\t"', "list:- ",
    ]);
  });

  it("marks a quoted list item's marker too", () => {
    const doc = "> - one\n>   - two\n\nEnd";
    expect(markers(doc, doc.length).filter((m) => m.startsWith("list"))).toEqual(["list:- ", "list:- "]);
  });

  it("leaves a fenced block's fences as typed", () => {
    const doc = "```js\n**not bold**\n```\n\nEnd";
    expect(markers(doc, doc.length)).toEqual([]);
  });

  it("halves blank lines inside a list", () => {
    const doc = "- one\n\n- two\n\nEnd";
    expect(markers(doc, doc.length).filter((m) => m === "gap")).toEqual(["gap"]);
  });

  it("leaves frontmatter alone", () => {
    expect(markers("---\ntitle: x\n---\n\n# Title")).toEqual(["margin:# "]);
  });
});
