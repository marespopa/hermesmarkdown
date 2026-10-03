// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ContentIndex, foldCase } from "./content-index";

describe("foldCase", () => {
  it("lowercases without changing the length", () => {
    expect(foldCase("Hello World")).toBe("hello world");
    const folded = foldCase("İstanbul ÉTÉ");
    expect(folded).toHaveLength("İstanbul ÉTÉ".length);
    expect(folded.endsWith("stanbul été")).toBe(true);
  });
});

describe("ContentIndex", () => {
  it("stores the body start past the frontmatter", () => {
    const index = new ContentIndex();
    const content = "---\ntitle: A\n---\nBody text";
    index.upsert("a.md", "a.md", content, 1);
    const entry = index.get("a.md")!;
    expect(content.slice(entry.bodyStart)).toBe("\nBody text");
    expect(entry.folded).toBe(content.toLowerCase());

    index.upsert("b.md", "b.md", "No frontmatter", 1);
    expect(index.get("b.md")!.bodyStart).toBe(0);
  });

  it("flags notes marked sensitive in frontmatter", () => {
    const index = new ContentIndex();
    index.upsert("s.md", "s.md", "---\nsensitive: true\n---\nsecret", 1);
    index.upsert("t.md", "t.md", "---\ntags: [private]\n---\nsecret", 1);
    index.upsert("p.md", "p.md", "plain #private", 1);
    expect(index.get("s.md")!.sensitive).toBe(true);
    expect(index.get("t.md")!.sensitive).toBe(true);
    expect(index.get("p.md")!.sensitive).toBe(false);
  });

  it("ignores a copy older than the stored one", () => {
    const index = new ContentIndex();
    index.upsert("a.md", "a.md", "unsaved edit", 10);
    index.upsert("a.md", "a.md", "stale disk read", 5);
    expect(index.get("a.md")!.text).toBe("unsaved edit");
    index.upsert("a.md", "a.md", "newer", 10);
    expect(index.get("a.md")!.text).toBe("newer");
  });

  it("removes notes", () => {
    const index = new ContentIndex();
    index.upsert("a.md", "a.md", "x", 1);
    index.upsert("b.md", "b.md", "y", 1);
    index.remove(["a.md", "missing.md"]);
    expect(index.has("a.md")).toBe(false);
    expect(index.has("b.md")).toBe(true);
  });

  it("remaps a file and renames its entry", () => {
    const index = new ContentIndex();
    index.upsert("old.md", "old.md", "text", 1);
    index.remap("old.md", "dir/new.md");
    expect(index.has("old.md")).toBe(false);
    expect(index.get("dir/new.md")).toMatchObject({ name: "new.md", text: "text" });
  });

  it("remaps a folder prefix without touching siblings that share a name prefix", () => {
    const index = new ContentIndex();
    index.upsert("a/b/one.md", "one.md", "1", 1);
    index.upsert("a/b/deep/two.md", "two.md", "2", 1);
    index.upsert("a/bc/three.md", "three.md", "3", 1);
    index.remap("a/b", "x");
    expect(index.has("x/one.md")).toBe(true);
    expect(index.has("x/deep/two.md")).toBe(true);
    expect(index.has("a/bc/three.md")).toBe(true);
    expect(index.has("a/b/one.md")).toBe(false);
  });

  it("truncates notes past the per-note limit", () => {
    const index = new ContentIndex({ maxNoteChars: 5 });
    index.upsert("a.md", "a.md", "0123456789", 1);
    expect(index.get("a.md")!.text).toBe("01234");
  });

  it("reports capped and skips notes once the total limit is reached", () => {
    const index = new ContentIndex({ maxTotalChars: 10 });
    index.upsert("a.md", "a.md", "123456", 1);
    expect(index.capped).toBe(false);
    index.upsert("b.md", "b.md", "123456", 1);
    expect(index.capped).toBe(true);
    expect(index.has("b.md")).toBe(false);
    expect(index.has("a.md")).toBe(true);
    // Emptying the index (vault closed) starts over.
    index.remove(["a.md"]);
    expect(index.capped).toBe(false);
  });
});
