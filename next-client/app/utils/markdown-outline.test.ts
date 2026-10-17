import { describe, expect, it } from "vitest";
import { buildOutlineTree, extractOutline } from "./markdown-outline";

describe("extractOutline", () => {
  it("lists H1–H3 headings with their 1-based lines", () => {
    expect(extractOutline("# Roadmap\n\nIntro\n## Goals\n### Q4 launch\n#### Too deep")).toEqual([
      { level: 1, text: "Roadmap", line: 1 },
      { level: 2, text: "Goals", line: 4 },
      { level: 3, text: "Q4 launch", line: 5 },
    ]);
  });

  it("drops closing hashes and needs a space after the marks", () => {
    expect(extractOutline("## Budget ##\n#hashtag")).toEqual([{ level: 2, text: "Budget", line: 1 }]);
  });

  it("skips the frontmatter and fenced code", () => {
    const note = ["---", "title: Release", "---", "# Release notes", "```md", "# not a heading", "```", "## Fixes"].join("\n");
    expect(extractOutline(note)).toEqual([
      { level: 1, text: "Release notes", line: 4 },
      { level: 2, text: "Fixes", line: 8 },
    ]);
  });
});

describe("buildOutlineTree", () => {
  const shape = (nodes: ReturnType<typeof buildOutlineTree>): unknown =>
    nodes.map((node) => node.children.length ? [node.heading.text, shape(node.children)] : node.heading.text);

  it("nests each heading under the last one above its level", () => {
    const tree = buildOutlineTree(extractOutline("# Plan\n## Goals\n### Q4\n## Risks\n# Notes"));
    expect(shape(tree)).toEqual([["Plan", [["Goals", ["Q4"]], "Risks"]], "Notes"]);
  });

  it("nests a skipped level one step, and starts with whatever level comes first", () => {
    expect(shape(buildOutlineTree(extractOutline("### Intro\n# Plan\n### Detail")))).toEqual(["Intro", ["Plan", ["Detail"]]]);
  });
});
