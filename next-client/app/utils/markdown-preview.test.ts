// @vitest-environment node
import { describe, expect, it } from "vitest";
import { notePreview, stripFrontmatter, stripMarkdownLine } from "./markdown-preview";

describe("stripFrontmatter", () => {
  it("removes a leading YAML block", () => {
    expect(stripFrontmatter("---\ntags: [a]\n---\nBody")).toBe("Body");
  });

  it("leaves content without frontmatter alone", () => {
    expect(stripFrontmatter("Body\n---\n")).toBe("Body\n---\n");
  });
});

describe("stripMarkdownLine", () => {
  it("keeps only the text", () => {
    expect(stripMarkdownLine("- [x] **Ship** [[Release Plan|the release]] via [link](https://a.b)"))
      .toBe("Ship the release via link");
    expect(stripMarkdownLine("> > nested quote")).toBe("nested quote");
  });
});

describe("notePreview", () => {
  it("skips frontmatter and the title heading", () => {
    const content = "---\ntitle: X\n---\n# Weekly review\n\nShipped the **feed**.\n- Next: palette";
    expect(notePreview(content)).toBe("Shipped the feed. Next: palette");
  });

  it("skips code blocks, tables, rules and comments", () => {
    const content = "Intro\n```js\nconst a = 1;\n```\n| a | b |\n|---|---|\n---\n<!-- hidden -->\nOutro";
    expect(notePreview(content)).toBe("Intro Outro");
  });

  it("keeps later headings as text", () => {
    expect(notePreview("First line\n## Section\nMore")).toBe("First line Section More");
  });

  it("truncates at a word boundary with an ellipsis", () => {
    const preview = notePreview("word ".repeat(100), 40);
    expect(preview.endsWith("…")).toBe(true);
    expect(preview.length).toBeLessThanOrEqual(41);
  });

  it("is empty for a note with only a title", () => {
    expect(notePreview("# Just a title\n")).toBe("");
  });
});
