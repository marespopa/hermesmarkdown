import { describe, it, expect } from "vitest";
import { encode } from "gpt-tokenizer";
import { computeTokenEstimate } from "./tokenEstimate";

describe("computeTokenEstimate", () => {
  it("returns all zeros for empty content", () => {
    const result = computeTokenEstimate("");
    expect(result).toEqual({ readWhen: 0, scoped: 0, full: 0 });
  });

  it("returns zero readWhen/scoped when there is no frontmatter", () => {
    const content = "# Heading\n\nSome body text.";
    const result = computeTokenEstimate(content);
    expect(result.readWhen).toBe(0);
    expect(result.scoped).toBe(0);
    expect(result.full).toBe(encode(content).length);
  });

  it("counts read_when tokens only when scope is absent", () => {
    const content = [
      "---",
      "title: Test",
      "read_when: [daily review, ops]",
      "---",
      "",
      "# Heading",
    ].join("\n");
    const result = computeTokenEstimate(content);
    const expectedReadWhen = encode("daily review, ops").length;
    expect(result.readWhen).toBe(expectedReadWhen);
    expect(result.scoped).toBe(expectedReadWhen);
    expect(result.full).toBe(encode(content).length);
  });

  it("adds scope tokens on top of read_when for the scoped tier", () => {
    const content = [
      "---",
      "title: Test",
      'scope: "Checklist for weekly vault maintenance."',
      "read_when: [weekly review]",
      "---",
      "",
      "# Heading",
    ].join("\n");
    const result = computeTokenEstimate(content);
    const readWhenTokens = encode("weekly review").length;
    const scopeTokens = encode(
      "Checklist for weekly vault maintenance.",
    ).length;
    expect(result.readWhen).toBe(readWhenTokens);
    expect(result.scoped).toBe(readWhenTokens + scopeTokens);
    expect(result.full).toBe(encode(content).length);
  });

  it("counts only scope tokens when read_when is absent", () => {
    const content = [
      "---",
      "title: Test",
      'scope: "A short summary."',
      "---",
      "",
      "# Heading",
    ].join("\n");
    const result = computeTokenEstimate(content);
    expect(result.readWhen).toBe(0);
    expect(result.scoped).toBe(encode("A short summary.").length);
  });

  it("full always reflects the entire file, including frontmatter", () => {
    const content = [
      "---",
      "title: Test",
      'scope: "A short summary."',
      "read_when: [always]",
      "---",
      "",
      "# Heading",
      "",
      "Body text that is longer than the frontmatter fields alone.",
    ].join("\n");
    const result = computeTokenEstimate(content);
    expect(result.full).toBe(encode(content).length);
    expect(result.full).toBeGreaterThan(result.scoped);
  });
});
