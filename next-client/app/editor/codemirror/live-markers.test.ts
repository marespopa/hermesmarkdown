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

// What each decoration does: "hide:<text>" for a hidden range,
// "bullet:<text>" / "task:<text>" for a marker drawn as a bullet or checkbox,
// "margin:<text>" for marks hung in the margin, "number:<text>" for an
// ordered marker's box, "indent:<width>" for a list item's widened indent,
// "hang:<width>" for a list line's hanging indent, "line" for any other line
// decoration.
function markers(doc: string, caret?: number, focused = true): string[] {
  const state = stateFor(doc, caret);
  const set = buildLiveMarkerDecorations(state, [{ from: 0, to: state.doc.length }], focused);
  const out: string[] = [];
  set.between(0, state.doc.length, (from, to, deco) => {
    const text = state.doc.sliceString(from, to);
    const cls = deco.spec.class;
    const style = deco.spec.attributes?.style;
    const widget = deco.spec.widget?.constructor.name;
    if (cls === "cm-listLine") out.push(`hang:${style.replace("--list-hang: ", "")}`);
    else if (cls === "cm-listGap") out.push("gap");
    else if (cls === "cm-codeFenceRow") out.push("fence-row");
    else if (cls === "cm-marginOnly") out.push("strut");
    else if (widget === "CodeLanguageWidget") out.push(`lang:${deco.spec.widget.language}`);
    else if (widget === "CalloutLabelWidget") out.push(`callout:${text}`);
    else if (cls === "cm-fenceHidden") out.push(`fence:${text}`);
    else if (from === to) out.push("line");
    else if (cls === "cm-listIndent") out.push(`indent:${style}`);
    else if (cls === "cm-listNumber") out.push(`number:${text}`);
    // Invisible margin marks read as hidden: the text sees no difference.
    else if (cls === "cm-marginMarks cm-marginMarks-off") out.push(`hide:${text}`);
    else if (cls === "cm-marginMarks") out.push(`margin:${text}`);
    else if (widget) out.push(`${widget === "TaskBoxWidget" ? "task" : "bullet"}:${text}`);
    else out.push(`hide:${text}`);
  });
  return out;
}

const withoutHangs = (list: string[]) => list.filter((m) => !m.startsWith("hang:"));

describe("buildLiveMarkerDecorations", () => {
  it("hides bold, italic, strikethrough and inline-code marks away from the caret", () => {
    const doc = "Some **bold**, _it_, ~~gone~~ and `code`.\n\nNext line";
    expect(markers(doc, doc.length)).toEqual([
      "hide:**", "hide:**", "hide:_", "hide:_", "hide:~~", "hide:~~", "hide:`", "hide:`",
    ]);
  });

  it("reveals an inline span's marks while the caret touches it", () => {
    const doc = "Some **bold** and ~~gone~~";
    expect(markers(doc, doc.indexOf("bold") + 2)).toEqual(["hide:~~", "hide:~~"]);
    // At the closing edge, just after typing the marks.
    expect(markers(doc, doc.length)).toEqual(["hide:**", "hide:**"]);
  });

  it("hangs heading and quote marks in the margin on the caret's line", () => {
    const doc = "# Title\n\n> Quoted\n\nBody";
    expect(markers(doc, doc.length)).toEqual(["hide:# ", "line", "hide:> "]);
    expect(markers(doc, 3)).toEqual(["margin:# ", "line", "hide:> "]);
    expect(markers(doc, doc.indexOf("Quoted"))).toEqual(["hide:# ", "line", "margin:> "]);
  });

  it("props up a row that holds only margin marks, on or off the caret's line", () => {
    const doc = "## \n\n> \n\nBody";
    expect(markers(doc, 3)).toEqual(["strut", "margin:## ", "strut", "line", "hide:> "]);
    expect(markers(doc, doc.length)).toEqual(["strut", "hide:## ", "strut", "line", "hide:> "]);
    expect(markers("## Title", 3)).toEqual(["margin:## "]);
  });

  it("treats a nested quote's marks as one run", () => {
    const doc = "> > deep\n\nEnd";
    expect(markers(doc, doc.length)).toEqual(["line", "hide:> > "]);
  });

  it("draws bullets for list dashes wherever the caret is", () => {
    const doc = "- one\n- two\n\nEnd";
    const bullets = ["bullet:- ", "bullet:- "];
    expect(withoutHangs(markers(doc, doc.length))).toEqual(bullets);
    // Caret on the dash, or right after "- " where Enter leaves it: still a bullet.
    expect(withoutHangs(markers(doc, 1))).toEqual(bullets);
    expect(withoutHangs(markers(doc, doc.indexOf("two")))).toEqual(bullets);
  });

  it("draws task boxes as checkboxes wherever the caret is", () => {
    const doc = "- [ ] open\n- [x] done\n- [/] going\n\nEnd";
    const tasks = ["task:- [ ] ", "task:- [x] ", "task:- [/] "];
    expect(withoutHangs(markers(doc, doc.length))).toEqual(tasks);
    expect(withoutHangs(markers(doc, doc.indexOf("open")))).toEqual(tasks);
  });

  it("sets ordered markers in a fixed-width box", () => {
    const doc = "1. first\n10. tenth\n\nEnd";
    expect(withoutHangs(markers(doc, doc.length))).toEqual(["number:1. ", "number:10. "]);
  });

  it("widens a nested item's indent whether or not the caret is on it", () => {
    const doc = "- one\n  - two\n1. first\n   1. second\n\t- tabbed\n\nEnd";
    const expected = ["indent:width: 1.5em", "indent:width: 2.25em", "indent:width: 3em"];
    expect(markers(doc, doc.length).filter((m) => m.startsWith("indent"))).toEqual(expected);
    expect(markers(doc, doc.indexOf("two")).filter((m) => m.startsWith("indent"))).toEqual(expected);
  });

  it("hangs an item's wrapped lines at its text", () => {
    const doc = "- one\n  - two\n- [ ] task\n1. first\n   1. second\n\nEnd";
    expect(markers(doc, doc.length).filter((m) => m.startsWith("hang"))).toEqual([
      "hang:1.5em", "hang:3em", "hang:1.5em", "hang:2.25em", "hang:4.5em",
    ]);
  });

  it("leaves a quoted list item's prefix alone", () => {
    const doc = "> - one\n>   - two\n\nEnd";
    const out = markers(doc, doc.length);
    expect(out.some((m) => m.startsWith("indent") || m.startsWith("hang"))).toBe(false);
  });

  it("shows a callout's type as a label and hides its body's marks", () => {
    const doc = "> [!note] Title\n> body\n\nEnd";
    expect(markers(doc, doc.length)).toEqual(["callout:> [!note] ", "hide:> "]);
    // Caret at the title's start: still a label, the body line's marks in the margin.
    expect(markers(doc, doc.indexOf("Title"))).toEqual(["callout:> [!note] ", "hide:> "]);
    expect(markers(doc, doc.indexOf("body"))).toEqual(["callout:> [!note] ", "margin:> "]);
    // Caret before the title (Home): the syntax shows.
    expect(markers(doc, 0)).toEqual(["hide:> "]);
  });

  it("fades a fenced block's fences away from the caret, keeping their rows", () => {
    const doc = "```js\n**not bold**\n```\n\nEnd";
    expect(markers(doc, doc.length)).toEqual(["fence-row", "fence:```js", "lang:js", "fence:```"]);
    expect(markers(doc, doc.indexOf("not"))).toEqual([]);
    expect(markers("```\ncode\n```\n\nEnd", 0, false)).toEqual(["fence:```", "fence:```"]);
  });

  it("halves blank lines inside a list", () => {
    const doc = "- one\n\n- two\n\nEnd";
    expect(markers(doc, doc.length).filter((m) => m === "gap")).toEqual(["gap"]);
  });

  it("leaves frontmatter alone", () => {
    const doc = "---\ntitle: **x**\n---\n\n**bold**";
    expect(markers(doc, 0, false)).toEqual(["hide:**", "hide:**"]);
  });

  it("hides every mark when the editor isn't focused", () => {
    const doc = "# Title **bold**";
    expect(markers(doc, 4, false)).toEqual(["hide:# ", "hide:**", "hide:**"]);
  });
});
