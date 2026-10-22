import { EditorSelection, EditorState } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { describe, expect, it } from "vitest";
import { buildSyntaxRevealDecorations, revealAt } from "./syntax-reveal";

// The text each hidden range covers, in order, for a selection (focused) or
// none (unfocused). A line whose margin marks are made invisible (a line
// decoration) counts as its run of `>`s and `#`s.
const REGEX_MARGIN_RUN = /^[ \t]*(?:>[ \t]?)*(?:#{1,6}(?:[ \t]|$))?/;

function hiddenTextSel(doc: string, sel: EditorSelection | null): string[] {
  const state = EditorState.create({
    doc,
    selection: sel ?? EditorSelection.cursor(0),
    extensions: [markdown({ base: markdownLanguage }), EditorState.allowMultipleSelections.of(true)],
  });
  const set = buildSyntaxRevealDecorations(state, [{ from: 0, to: doc.length }], revealAt(state, sel !== null));
  const out: string[] = [];
  set.between(0, doc.length, (from, to) => {
    out.push(from === to ? REGEX_MARGIN_RUN.exec(state.doc.lineAt(from).text)![0] : state.doc.sliceString(from, to));
  });
  return out;
}

function hiddenText(doc: string, caret: number | null): string[] {
  return hiddenTextSel(doc, caret === null ? null : EditorSelection.single(caret));
}

describe("syntax reveal", () => {
  const doc = "## Title\n\nSome **bold**, _it_, ~~gone~~ and `code`.\n\n> Quoted";

  it("hides marks on every line but the caret's", () => {
    const caret = doc.indexOf("Quoted");
    expect(hiddenText(doc, caret)).toEqual(["## ", "**", "**", "_", "_", "~~", "~~", "`", "`"]);
  });

  it("reveals only the token under the caret, and block marks on its line", () => {
    expect(hiddenText(doc, doc.indexOf("bold"))).toEqual(["## ", "_", "_", "~~", "~~", "`", "`", "> "]);
    expect(hiddenText(doc, doc.indexOf("it_") + 1)).toEqual(["## ", "**", "**", "~~", "~~", "`", "`", "> "]);
    expect(hiddenText(doc, doc.indexOf("code") + 1)).toEqual(["## ", "**", "**", "_", "_", "~~", "~~", "> "]);
    expect(hiddenText(doc, 1)).not.toContain("## ");
  });

  it("counts a token's edges as touching", () => {
    const d = "Some **bold**, more";
    expect(hiddenText(d, d.indexOf("**"))).toEqual([]);
    expect(hiddenText(d, d.indexOf(","))).toEqual([]);
    expect(hiddenText(d, d.indexOf(",") + 1)).toEqual(["**", "**"]);
  });

  it("reveals nested tokens from the inside out", () => {
    const d = "**bold _it_ more**";
    expect(hiddenText(d, d.indexOf("it"))).toEqual([]);
    expect(hiddenText(d, d.indexOf("more"))).toEqual(["_", "_"]);
  });

  it("reveals a token that spans two lines from either line", () => {
    const d = "**bold\nstill**";
    expect(hiddenText(d, d.indexOf("still"))).toEqual([]);
  });

  it("reveals the tokens every selection range touches", () => {
    const sel = EditorSelection.create([
      EditorSelection.cursor(doc.indexOf("bold")),
      EditorSelection.cursor(doc.indexOf("code")),
    ]);
    expect(hiddenTextSel(doc, sel)).toEqual(["## ", "_", "_", "~~", "~~", "> "]);
  });

  it("keeps heading marks line-level and inline tokens token-level", () => {
    const d = "## A **bold** title\n\nNext";
    expect(hiddenText(d, d.indexOf("\n"))).toEqual(["**", "**"]);
    expect(hiddenText(d, d.length)).toEqual(["## ", "**", "**"]);
  });

  it("keeps margin marks in the line, unseen, and replaces a quoted heading's inline `#`s", () => {
    const d = "# Title\n\n> ## Quoted\n\n> - # Listed\n\nEnd";
    const state = EditorState.create({ doc: d, extensions: [markdown({ base: markdownLanguage })] });
    const set = buildSyntaxRevealDecorations(state, [{ from: 0, to: d.length }], revealAt(state, false));
    const found: { text: string; line: boolean }[] = [];
    set.between(0, d.length, (from, to, deco) => {
      found.push({ text: state.doc.sliceString(from, to), line: deco.spec.class === "cm-marginMarksHidden" });
    });
    expect(found).toEqual([
      { text: "", line: true },
      { text: "", line: true },
      { text: "", line: true },
      { text: "# ", line: false },
    ]);
  });

  it("never hides intraword underscores or spaced asterisks", () => {
    const d = "snake_case_name and 2 * 3 * 4\n\nEnd";
    expect(hiddenText(d, d.length)).toEqual([]);
    expect(hiddenText(d, 2)).toEqual([]);
  });

  it("hides every line's marks while the editor isn't focused", () => {
    expect(hiddenText(doc, null)).toEqual(["## ", "**", "**", "_", "_", "~~", "~~", "`", "`", "> "]);
  });

  it("hides a callout's `>`s and its `[!type]`, and a nested quote's run as one", () => {
    const callout = "> [!note]+ Title\n> > deep\n\nEnd";
    expect(hiddenText(callout, callout.length)).toEqual(["> ", "[!note]+ ", "> > "]);
    expect(hiddenText(callout, 3)).toEqual(["> > "]);
  });

  it("leaves list markers, code blocks, quoted tables and frontmatter alone", () => {
    const other = "---\n# comment: x\n---\n- [ ] task\n\n```\n**not**\n```\n\n> [!tip] T\n> | a | b |\n> | - | - |\n\nEnd";
    expect(hiddenText(other, other.length)).toEqual(["> ", "[!tip] "]);
  });

  it("hides a quoted code block's `>`s but none of its code", () => {
    const code = "> [!tip] Code\n> ```json\n> **not** # x\n>```\n\nEnd";
    expect(hiddenText(code, code.length)).toEqual(["> ", "[!tip] ", "> ", "> ", ">"]);
  });
});
