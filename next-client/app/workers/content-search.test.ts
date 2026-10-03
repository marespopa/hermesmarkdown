// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { ContentIndex } from "./content-index";
import { buildSnippet, handleContentMessage, parseContentQuery, searchContent } from "./content-search";

function indexOf(notes: Record<string, string>) {
  const index = new ContentIndex();
  for (const [path, content] of Object.entries(notes)) index.upsert(path, path.split("/").pop()!, content, 1);
  return index;
}

function search(notes: Record<string, string>, query: string, limit = 50) {
  return searchContent(indexOf(notes), query, Object.keys(notes), limit);
}

describe("parseContentQuery", () => {
  it("needs at least 2 characters after trimming", () => {
    expect(parseContentQuery("a")).toBeNull();
    expect(parseContentQuery("  a  ")).toBeNull();
    expect(parseContentQuery("ab")).toEqual({ terms: ["ab"], phrase: "ab" });
  });

  it("lowercases, splits on whitespace and drops duplicate terms", () => {
    expect(parseContentQuery("  Foo   BAR foo ")).toEqual({ terms: ["foo", "bar"], phrase: "foo bar foo" });
  });
});

describe("searchContent", () => {
  it("matches regardless of case", () => {
    const { hits } = search({ "a.md": "Hello World" }, "WORLD");
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ path: "a.md", line: 1, snippet: "Hello World" });
  });

  it("requires every term, on any line", () => {
    const notes = { "a.md": "alpha here\nand beta there" };
    expect(search(notes, "alpha beta").hits.map((hit) => hit.line)).toEqual([1, 2]);
    expect(search(notes, "alpha gamma").hits).toEqual([]);
  });

  it("never fuzzy-matches single characters across the note", () => {
    expect(search({ "a.md": "a long b sentence c" }, "abc").hits).toEqual([]);
  });

  it("skips the frontmatter but counts its lines", () => {
    const notes = { "a.md": "---\ntitle: Zebra\n---\nfirst line\nthe needle here" };
    expect(search(notes, "zebra").hits).toEqual([]);
    expect(search(notes, "needle").hits[0]).toMatchObject({ line: 5, column: 4 });
  });

  it("searches inside fenced code blocks", () => {
    const { hits } = search({ "a.md": "Intro\n```js\nconst needle = 1;\n```" }, "needle");
    expect(hits[0]).toMatchObject({ line: 3, snippet: "const needle = 1;" });
  });

  it("ranks an exact phrase above scattered words", () => {
    const { hits } = search({
      "a-scattered.md": "the fox ran\nlater, brown leaves",
      "b-phrase.md": "a quick brown fox jumps",
    }, "brown fox");
    expect(hits[0].path).toBe("b-phrase.md");
  });

  it("returns at most 3 lines per note, best first", () => {
    const { hits } = search({ "a.md": "needle\nneedle\n# needle heading\nneedle\nneedle" }, "needle");
    expect(hits).toHaveLength(3);
    expect(hits[0].line).toBe(3);
  });

  it("respects the limit and the path list, counting unindexed paths as pending", () => {
    const index = indexOf({ "a.md": "x needle\nneedle", "b.md": "needle", "c.md": "needle" });
    const result = searchContent(index, "needle", ["a.md", "b.md", "unindexed.md"], 2);
    expect(result.hits).toHaveLength(2);
    expect(result.hits.some((hit) => hit.path === "c.md")).toBe(false);
    expect(result.pending).toBe(1);
  });

  it("never returns a sensitive note", () => {
    const { hits } = search({
      "secret.md": "---\nsensitive: true\n---\nthe needle",
      "plain.md": "the needle",
    }, "needle");
    expect(hits.map((hit) => hit.path)).toEqual(["plain.md"]);
  });

  it("puts the column on the first match in the line", () => {
    const { hits } = search({ "a.md": "foo bar baz" }, "baz bar");
    expect(hits[0]).toMatchObject({ column: 4 });
  });

  it("reports the cap", () => {
    const index = new ContentIndex({ maxTotalChars: 4 });
    index.upsert("a.md", "a.md", "too long", 1);
    expect(searchContent(index, "long", ["a.md"], 50)).toMatchObject({ hits: [], pending: 1, capped: true });
  });
});

describe("buildSnippet", () => {
  it("trims the line and shifts highlights", () => {
    const raw = "    a needle";
    expect(buildSnippet(raw, raw.toLowerCase(), ["needle"])).toEqual({ snippet: "a needle", highlights: [2, 3, 4, 5, 6, 7] });
  });

  it("windows long lines around the first match with ellipses", () => {
    const raw = `${"x".repeat(200)}needle${"y".repeat(200)}`;
    const { snippet, highlights } = buildSnippet(raw, raw, ["needle"]);
    expect(snippet.startsWith("…")).toBe(true);
    expect(snippet.endsWith("…")).toBe(true);
    expect(snippet).toHaveLength(142);
    expect(snippet.slice(highlights[0], highlights[0] + 6)).toBe("needle");
    expect(highlights).toEqual([41, 42, 43, 44, 45, 46]);
  });

  it("cuts only the end when the match is near the start", () => {
    const raw = `needle ${"y".repeat(300)}`;
    const { snippet, highlights } = buildSnippet(raw, raw, ["needle"]);
    expect(snippet.startsWith("needle")).toBe(true);
    expect(snippet.endsWith("…")).toBe(true);
    expect(highlights[0]).toBe(0);
  });
});

describe("handleContentMessage", () => {
  it("indexes, remaps, removes and answers searches; ignores untyped messages", () => {
    const index = new ContentIndex();
    const post = vi.fn();
    expect(handleContentMessage(index, { files: [] } as any, post)).toBe(false);

    handleContentMessage(index, { type: "content:index", files: [{ path: "a.md", name: "a.md", content: "needle", modifiedAt: 1 }] }, post);
    handleContentMessage(index, { type: "content:remap", oldPath: "a.md", newPath: "b.md" }, post);
    handleContentMessage(index, { type: "content:search", searchId: 7, query: "needle", paths: ["b.md"], limit: 50 }, post);
    expect(post).toHaveBeenCalledWith(expect.objectContaining({ type: "content:results", searchId: 7, pending: 0 }));
    expect(post.mock.calls[0][0].hits[0].path).toBe("b.md");
    expect(post.mock.calls[0][0]).not.toHaveProperty("results");
    expect(post.mock.calls[0][0]).not.toHaveProperty("requestId");

    handleContentMessage(index, { type: "content:remove", paths: ["b.md"] }, post);
    expect(index.has("b.md")).toBe(false);
  });
});
