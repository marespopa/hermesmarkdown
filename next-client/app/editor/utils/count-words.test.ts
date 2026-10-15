import { describe, expect, it } from "vitest";
import { countWords } from "./count-words";

describe("countWords", () => {
  it("counts words separated by any whitespace", () => {
    expect(countWords("Ship the release\nthen update  the\tdocs")).toBe(7);
  });

  it("returns 0 for an empty or blank note", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("  \n\n ")).toBe(0);
  });

  it("leaves out Markdown marks that stand on their own", () => {
    expect(countWords("# Roadmap\n\n- [ ] Draft spec\n> Quoted note\n\n---\n| Status |")).toBe(6);
  });

  it("counts words that carry Markdown inline", () => {
    expect(countWords("**Bold** and _italic_ and [[Linked note]]")).toBe(6);
  });

  it("leaves out frontmatter", () => {
    expect(countWords("---\ntags: [product, roadmap]\nstatus: draft\n---\nLaunch checklist")).toBe(2);
  });

  it("counts words in other scripts and numbers", () => {
    expect(countWords("Café 2026 версия")).toBe(3);
  });
});
