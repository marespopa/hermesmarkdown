// @vitest-environment node
import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import { computeMarkdownDecorations, isHorizontalRule } from "./highlight";

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
  it("dims the complete frontmatter block without dimming the body", () => {
    const doc = "---\ntitle: Note\n---\nBody";
    const decos = decorationsFor(doc);
    const frontmatterStart = 0;
    const bodyStart = doc.indexOf("Body");

    expect(decos.filter((d) => d.class.includes("cm-frontmatter-line"))).toHaveLength(3);
    expect(decos.some((d) => d.from === frontmatterStart && d.class.includes("cm-frontmatter-line"))).toBe(true);
    expect(decos.some((d) => d.from === frontmatterStart && d.class.includes("cm-frontmatter-start"))).toBe(true);
    expect(decos.some((d) => d.class.includes("cm-frontmatter-end"))).toBe(true);
    expect(decos.some((d) => d.from === bodyStart && d.class.includes("cm-frontmatter-line"))).toBe(false);
    const titleFrom = doc.indexOf("title");
    expect(decos.some((d) => d.from === titleFrom && d.to === titleFrom + "title".length
      && d.class.includes("cm-frontmatter-key"))).toBe(true);
    expect(decos.some((d) => d.from === titleFrom + "title".length
      && d.class.includes("cm-frontmatter-separator"))).toBe(true);
  });

  it("styles # lines inside frontmatter as YAML comments, not headings", () => {
    const doc = "---\n# target_folder: notes\n---\n# Title";
    const decos = decorationsFor(doc);
    const commentFrom = doc.indexOf("# target");
    const titleFrom = doc.indexOf("# Title");

    expect(decos.some((d) => d.from === commentFrom && d.class.includes("cm-frontmatter-comment"))).toBe(true);
    expect(decos.some((d) => d.from === commentFrom && d.class.includes("cm-heading"))).toBe(false);
    expect(decos.some((d) => d.from === titleFrom && d.class.includes("cm-heading-1"))).toBe(true);
  });

  it("marks a heading's hashes as faded and its label as semibold", () => {
    const doc = "# Hello";
    const decos = decorationsFor(doc);
    const hashFrom = doc.indexOf("#");
    const labelFrom = doc.indexOf("Hello");
    expect(decos.some((d) => d.from === hashFrom && d.class.includes("opacity-40"))).toBe(true);
    expect(decos.some((d) => d.from === labelFrom && d.class.includes("font-semibold"))).toBe(true);
  });

  // Sizes live in editor-typography.scss, keyed by the line class.
  it("tags each ATX heading line with its level for the heading scale", () => {
    const doc = "# One\n## Two\n### Three\n#### Four\n##### Five\n###### Six";
    const decos = decorationsFor(doc);

    for (let level = 1; level <= 6; level++) {
      const lineStart = doc.split("\n").slice(0, level - 1).join("\n").length + (level > 1 ? 1 : 0);
      expect(decos.some((d) => d.from === lineStart && d.class.split(" ").includes(`cm-heading-${level}`))).toBe(true);
    }
  });

  it("marks bold text with font-bold, keeping markers fainter than other syntax", () => {
    const doc = "a **bold** word";
    const decos = decorationsFor(doc);
    const innerFrom = doc.indexOf("bold");
    expect(decos.some((d) => d.from === innerFrom && d.to === innerFrom + 4 && d.class.includes("font-bold"))).toBe(true);
    const markerFrom = doc.indexOf("**");
    expect(decos.some((d) => d.from === markerFrom && d.class.includes("opacity-25"))).toBe(true);
  });

  it("styles a task's label by its state", () => {
    const doc = "- [x] done thing\n- [-] dropped\n- [/] going\n- [ ] open";
    const decos = decorationsFor(doc);
    const classAt = (word: string) => decos.filter((d) => d.from === doc.indexOf(word)).map((d) => d.class).join(" ");
    expect(classAt("done")).toContain("cm-task-done");
    expect(classAt("dropped")).toContain("cm-task-cancelled");
    expect(classAt("going")).not.toMatch(/cm-task-/);
    expect(classAt("open")).not.toMatch(/cm-task-/);
  });

  it("leaves currency amounts undecorated", () => {
    const doc = "Cost: $42,246 total\n- [ ] Budget: $100 and €20";
    const decos = decorationsFor(doc);
    for (const amount of ["$42,246", "$100", "€20"]) {
      const amountFrom = doc.indexOf(amount);
      expect(decos.some((d) => d.from === amountFrom && d.to === amountFrom + amount.length)).toBe(false);
    }
  });

  // Tags are drawn by tag-pills.ts, edited or not.
  it("leaves hashtags to the tag pills", () => {
    const doc = "status #draft here";
    const decos = decorationsFor(doc);
    expect(decos.some((d) => d.from === doc.indexOf("#draft"))).toBe(false);
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
    const doc = "- [ ] See [[My Note|the note]] for $100";
    const decos = decorationsFor(doc);
    const nameFrom = doc.indexOf("My Note");
    expect(decos.some((d) => d.from === nameFrom && d.to === doc.indexOf("]]") && d.class.includes("underline"))).toBe(true);
  });

  it("draws a --- between blocks as a horizontal rule", () => {
    const doc = "Intro\n\n---\n\nNext";
    const decos = decorationsFor(doc);
    const hrFrom = doc.indexOf("---");
    expect(decos.some((d) => d.from === hrFrom && d.class.includes("cm-hr") && !d.class.includes("cm-hr-marks"))).toBe(true);
    expect(decos.some((d) => d.from === hrFrom && d.to === hrFrom + 3 && d.class.includes("cm-hr-marks"))).toBe(true);
  });

  it("doesn't draw frontmatter fences as horizontal rules", () => {
    const decos = decorationsFor("---\ntitle: Note\n---\nBody");
    expect(decos.some((d) => d.class.split(" ").includes("cm-hr"))).toBe(false);
  });
});

describe("isHorizontalRule", () => {
  it("treats --- under a paragraph line as a setext heading, not a rule", () => {
    expect(isHorizontalRule("---", "")).toBe(true);
    expect(isHorizontalRule("---", "Heading text")).toBe(false);
    expect(isHorizontalRule("***", "Paragraph")).toBe(true);
    expect(isHorizontalRule("- - -", "")).toBe(true);
    expect(isHorizontalRule("---", "", true)).toBe(false);
  });
});
