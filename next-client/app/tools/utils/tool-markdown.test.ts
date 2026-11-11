import { describe, expect, it } from "vitest";
import { mermaidFence, mermaidHandoffMarkdown, tableHandoffMarkdown } from "./tool-markdown";

describe("handoff Markdown", () => {
  it("puts a title above the table", () => {
    expect(tableHandoffMarkdown("\n| a |\n| :-- |\n")).toBe("# Markdown table\n\n| a |\n| :-- |\n");
  });

  it("fences Mermaid longer than any backtick run inside it", () => {
    expect(mermaidFence("graph TD")).toBe("```");
    expect(mermaidFence("A[\"````x\"]")).toBe("`````");
    expect(mermaidHandoffMarkdown("graph TD\n  A-->B\n")).toBe("# Mermaid diagram\n\n```mermaid\ngraph TD\n  A-->B\n```\n");
  });
});
