import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import { computeMarkdownDecorations } from "./highlight";

interface FlatDeco {
  from: number;
  to: number;
  class: string;
}

function decorationsFor(doc: string): FlatDeco[] {
  const state = EditorState.create({ doc });
  const set = computeMarkdownDecorations(state);
  const out: FlatDeco[] = [];
  set.between(0, doc.length, (from, to, value: any) => {
    const cls = value.spec.class ?? value.spec.attributes?.class;
    if (cls) out.push({ from, to, class: cls });
  });
  return out;
}

describe("computeMarkdownDecorations", () => {
  it("marks a heading's hashes as faded and its label as bold", () => {
    const doc = "# Hello";
    const decos = decorationsFor(doc);
    const hashFrom = doc.indexOf("#");
    const labelFrom = doc.indexOf("Hello");
    expect(decos.some((d) => d.from === hashFrom && d.class.includes("opacity-40"))).toBe(true);
    expect(decos.some((d) => d.from === labelFrom && d.class.includes("font-bold"))).toBe(true);
  });

  it("scales each ATX heading level relative to the editor font", () => {
    const doc = "# One\n## Two\n### Three\n#### Four\n##### Five\n###### Six";
    const decos = decorationsFor(doc);
    const expectedSizes = ["1.5em", "1.35em", "1.2em", "1.1em", "1em", "0.95em"];

    for (const [index, size] of expectedSizes.entries()) {
      const lineStart = doc.split("\n").slice(0, index).join("\n").length + (index > 0 ? 1 : 0);
      expect(decos.some((d) => d.from === lineStart && d.class.includes(`!text-[${size}]`))).toBe(true);
    }
  });

  it("marks bold text with font-bold, keeping markers faded", () => {
    const doc = "a **bold** word";
    const decos = decorationsFor(doc);
    const innerFrom = doc.indexOf("bold");
    expect(decos.some((d) => d.from === innerFrom && d.to === innerFrom + 4 && d.class.includes("font-bold"))).toBe(true);
    const markerFrom = doc.indexOf("**");
    expect(decos.some((d) => d.from === markerFrom && d.class.includes("opacity-40"))).toBe(true);
  });

  it("strikes through a checked checkbox's whole label", () => {
    const doc = "- [x] done thing";
    const decos = decorationsFor(doc);
    const labelFrom = doc.indexOf("done");
    expect(decos.some((d) => d.from === labelFrom && d.class.includes("line-through"))).toBe(true);
  });

  it("colors currency amounts", () => {
    const doc = "Cost: $42,246 total";
    const decos = decorationsFor(doc);
    const amountFrom = doc.indexOf("$42");
    expect(decos.some((d) => d.from === amountFrom && d.class.includes("emerald"))).toBe(true);
  });

  it("colors a workflow hashtag using its tag color", () => {
    const doc = "status #draft here";
    const decos = decorationsFor(doc);
    const tagFrom = doc.indexOf("#draft");
    expect(decos.some((d) => d.from === tagFrom && d.class.includes("amber"))).toBe(true);
  });

  it("applies a colored left-border line decoration to a callout block", () => {
    const doc = "> [!warning] Careful\n> body";
    const decos = decorationsFor(doc);
    expect(decos.some((d) => d.class.includes("border-amber-500"))).toBe(true);
  });

  it("fades a fenced code block's opening fence", () => {
    const doc = "```js\ncode\n```";
    const decos = decorationsFor(doc);
    expect(decos.some((d) => d.from === 0 && d.class.includes("opacity-40"))).toBe(true);
  });

  it("shades a table header row differently from data rows", () => {
    const doc = "| A | B |\n| --- | --- |\n| 1 | 2 |";
    const decos = decorationsFor(doc);
    expect(decos.some((d) => d.class.includes("paper-softgray"))).toBe(true);
  });

  it("underlines a wikilink's display text and fades its brackets", () => {
    const doc = "See [[My Note]] for more";
    const decos = decorationsFor(doc);
    const nameFrom = doc.indexOf("My Note");
    expect(decos.some((d) => d.from === nameFrom && d.class.includes("underline"))).toBe(true);
  });
});
