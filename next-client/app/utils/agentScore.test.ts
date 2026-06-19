import { describe, it, expect } from "vitest";
import { computeAgentScore } from "./agentScore";

function checkById(checks: ReturnType<typeof computeAgentScore>["checks"], id: string) {
  const found = checks.find((c) => c.id === id);
  if (!found) throw new Error(`no check with id ${id}`);
  return found;
}

describe("computeAgentScore", () => {
  it("returns Empty with no checks for blank content", () => {
    const result = computeAgentScore("   ");
    expect(result.label).toBe("Empty");
    expect(result.score).toBe(0);
    expect(result.checks).toEqual([]);
  });

  it("fails all frontmatter checks when there is no frontmatter block", () => {
    const result = computeAgentScore("# Heading\n\nSome text.");
    expect(checkById(result.checks, "fm-block").passed).toBe(false);
    expect(checkById(result.checks, "fm-title").passed).toBe(false);
    expect(checkById(result.checks, "fm-title").fixField).toBe("title");
  });

  it("passes frontmatter checks when all fields are present", () => {
    const content = [
      "---",
      "title: Test",
      "status: active",
      "tags: [a, b]",
      'scope: "one line summary"',
      "read_when: [always]",
      "---",
      "",
      "# Heading",
    ].join("\n");
    const result = computeAgentScore(content);
    for (const id of ["fm-block", "fm-title", "fm-status", "fm-tags", "fm-scope", "fm-read-when"]) {
      expect(checkById(result.checks, id).passed).toBe(true);
    }
  });

  it("flags missing headings", () => {
    const result = computeAgentScore("---\ntitle: x\n---\n\nplain text body");
    expect(checkById(result.checks, "heading-min").passed).toBe(false);
    expect(checkById(result.checks, "heading-count").passed).toBe(false);
  });

  it("flags skipped heading levels", () => {
    const content = "# Title\n\n### Skipped to h3\n\nbody";
    const result = computeAgentScore(content);
    expect(checkById(result.checks, "heading-hierarchy").passed).toBe(false);
  });

  it("flags duplicate heading names", () => {
    const content = "# Intro\n\n## Intro\n\nbody";
    const result = computeAgentScore(content);
    expect(checkById(result.checks, "heading-unique").passed).toBe(false);
  });

  it("marks syntax-typed-fences as not-applicable when there are no code fences", () => {
    const result = computeAgentScore("# Title\n\nNo fences here.");
    const check = checkById(result.checks, "syntax-typed-fences");
    expect(check.na).toBe(true);
    expect(check.passed).toBe(true);
  });

  it("flags untyped code fences when fences are present", () => {
    const content = "# Title\n\n```\nconst x = 1;\n```";
    const result = computeAgentScore(content);
    expect(checkById(result.checks, "syntax-typed-fences").passed).toBe(false);
  });

  it("passes typed-fences check when fences have a language tag", () => {
    const content = "# Title\n\n```typescript\nconst x = 1;\n```";
    const result = computeAgentScore(content);
    expect(checkById(result.checks, "syntax-typed-fences").passed).toBe(true);
  });

  it("marks syntax-bullets as not-applicable when there are no bullets", () => {
    const result = computeAgentScore("# Title\n\nNo bullets here.");
    const check = checkById(result.checks, "syntax-bullets");
    expect(check.na).toBe(true);
  });

  it("flags asterisk bullets in favor of hyphen bullets", () => {
    const content = "# Title\n\n* item one\n* item two";
    const result = computeAgentScore(content);
    expect(checkById(result.checks, "syntax-bullets").passed).toBe(false);
  });

  it("flags missing tables and bold text", () => {
    const result = computeAgentScore("# Title\n\nplain text, no table, no bold");
    expect(checkById(result.checks, "syntax-table").passed).toBe(false);
    expect(checkById(result.checks, "syntax-bold").passed).toBe(false);
  });

  it("derives tips from failed, non-na checks only", () => {
    const result = computeAgentScore("# Title\n\nplain text");
    expect(result.tips).not.toContain("No code fences in this file");
    expect(result.tips.length).toBeGreaterThan(0);
  });

  it("sums breakdown categories to match total score", () => {
    const content = [
      "---",
      "title: Test",
      "status: active",
      "tags: [a]",
      'scope: "summary"',
      "read_when: [always]",
      "---",
      "",
      "# Title",
      "",
      "## Sub",
      "",
      "### Sub sub",
      "",
      "- item",
      "",
      "| a | b |",
      "|---|---|",
      "",
      "**bold**",
    ].join("\n");
    const result = computeAgentScore(content);
    const breakdownTotal = result.breakdown.reduce((sum, b) => sum + b.score, 0);
    expect(breakdownTotal).toBe(result.score);
  });
});
