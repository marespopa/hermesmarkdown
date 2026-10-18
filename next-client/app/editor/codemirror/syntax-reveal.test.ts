import { EditorSelection, EditorState } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { describe, expect, it } from "vitest";
import { activeLines, buildSyntaxRevealDecorations } from "./syntax-reveal";

// The text each hidden range covers, in order, with the caret at `caret`
// (focused) or no caret (unfocused).
function hiddenText(doc: string, caret: number | null): string[] {
  const state = EditorState.create({
    doc,
    selection: EditorSelection.cursor(caret ?? 0),
    extensions: [markdown({ base: markdownLanguage })],
  });
  const set = buildSyntaxRevealDecorations(state, [{ from: 0, to: doc.length }], activeLines(state, caret !== null));
  const out: string[] = [];
  set.between(0, doc.length, (from, to) => {
    out.push(state.doc.sliceString(from, to));
  });
  return out;
}

describe("syntax reveal", () => {
  const doc = "## Title\n\nSome **bold**, _it_, ~~gone~~ and `code`.\n\n> Quoted";

  it("hides marks on every line but the caret's", () => {
    const caret = doc.indexOf("Quoted");
    expect(hiddenText(doc, caret)).toEqual(["## ", "**", "**", "_", "_", "~~", "~~", "`", "`"]);
  });

  it("shows the caret line's marks as typed", () => {
    expect(hiddenText(doc, doc.indexOf("bold"))).toEqual(["## ", "> "]);
    expect(hiddenText(doc, 1)).not.toContain("## ");
  });

  it("hides every line's marks while the editor isn't focused", () => {
    expect(hiddenText(doc, null)).toEqual(["## ", "**", "**", "_", "_", "~~", "~~", "`", "`", "> "]);
  });

  it("hides a callout's `>`s and its `[!type]`, and a nested quote's run as one", () => {
    const callout = "> [!note]+ Title\n> > deep\n\nEnd";
    expect(hiddenText(callout, callout.length)).toEqual(["> [!note]+ ", "> > "]);
    expect(hiddenText(callout, 3)).toEqual(["> > "]);
  });

  it("leaves list markers, code blocks, quoted tables and frontmatter alone", () => {
    const other = "---\n# comment: x\n---\n- [ ] task\n\n```\n**not**\n```\n\n> [!tip] T\n> | a | b |\n> | - | - |\n\nEnd";
    expect(hiddenText(other, other.length)).toEqual(["> [!tip] "]);
  });
});
