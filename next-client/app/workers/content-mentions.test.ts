import { describe, expect, it } from "vitest";
import { ContentIndex } from "./content-index";
import { findMentions } from "./content-mentions";

function indexOf(notes: Record<string, string>) {
  const index = new ContentIndex();
  for (const [path, text] of Object.entries(notes)) index.upsert(path, path, text, 1);
  return index;
}

describe("findMentions", () => {
  it("matches whole words case-insensitively in the body only", () => {
    const index = indexOf({
      "a.md": "---\ntitle: Alpha\n---\nI like alpha here\nAlphabet soup\nlinked [[Alpha]] only",
      "b.md": "Nothing",
    });
    const { hits } = findMentions(index, ["Alpha"], ["a.md", "b.md"], 50);
    expect(hits.map((h) => [h.path, h.line])).toEqual([["a.md", 4]]);
    expect(hits[0].column).toBe(7);
  });

  it("skips excluded paths and private notes, counts pending", () => {
    const index = indexOf({ "a.md": "alpha", "p.md": "---\nprivate: true\n---\nalpha" });
    const result = findMentions(index, ["alpha"], ["p.md", "gone.md"], 50);
    expect(result.hits).toEqual([]);
    expect(result.pending).toBe(1);
  });

  it("caps hits per note, honours limit, orders by matching lines, handles two phrases", () => {
    const index = indexOf({
      "a.md": "alpha\nalpha\nalpha\nalpha",
      "b.md": "alpha\nbeta",
      "c.md": "x",
    });
    const all = findMentions(index, ["alpha", "beta"], ["a.md", "b.md", "c.md"], 50).hits;
    expect(all.filter((h) => h.path === "a.md")).toHaveLength(3);
    expect(all.map((h) => h.path)[0]).toBe("a.md");
    expect(all.filter((h) => h.path === "b.md").map((h) => h.line)).toEqual([1, 2]);
    expect(findMentions(index, ["alpha"], ["a.md", "b.md"], 2).hits).toHaveLength(2);
  });
});
