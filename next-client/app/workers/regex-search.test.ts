// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseRegexQuery, rankRegex } from "./regex-search";

const rank = (text: string, query: string, bodyStart = 0) =>
  rankRegex("a.ts", { text, bodyStart, name: "a.ts" }, parseRegexQuery(query)!);

describe("parseRegexQuery", () => {
  it("compiles case-insensitive, line-anchored patterns and rejects invalid ones", () => {
    expect(parseRegexQuery("^todo")!.flags).toContain("i");
    expect(parseRegexQuery("^todo")!.flags).toContain("m");
    // `\-` is invalid with the `u` flag; it still compiles without it.
    expect(parseRegexQuery("a\\-b")).not.toBeNull();
    expect(parseRegexQuery("(ab")).toBeNull();
    expect(parseRegexQuery("  ")).toBeNull();
  });
});

describe("rankRegex", () => {
  it("reports matching lines with columns and highlights", () => {
    const ranked = rank("const a = 1;\n  fetchOrders(42);\nfetchUsers();\n", "fetch\\w+\\(\\d+");
    expect(ranked!.hits).toHaveLength(1);
    expect(ranked!.hits[0]).toMatchObject({ line: 2, column: 2, snippet: "fetchOrders(42);" });
    expect(ranked!.hits[0].highlights).toEqual([...Array(14).keys()]);
  });

  it("collects several matches on one line into one hit", () => {
    const ranked = rank("foo bar foo\nbaz\n", "foo");
    expect(ranked!.hits).toHaveLength(1);
    expect(ranked!.hits[0].highlights).toEqual([0, 1, 2, 8, 9, 10]);
  });

  it("anchors at line starts, skips empty matches and text before bodyStart", () => {
    expect(rank("x\ny\n", "z*")).toBeNull();
    const text = "---\ntitle: todo\n---\ntodo: ship\n";
    const ranked = rank(text, "^todo", text.indexOf("todo:"));
    expect(ranked!.hits.map((hit) => hit.line)).toEqual([4]);
  });

  it("marks a match spanning lines in its first line", () => {
    const ranked = rank("alpha\nbeta\n", "pha\\nbe");
    expect(ranked!.hits[0]).toMatchObject({ line: 1, snippet: "alpha", highlights: [2, 3, 4] });
  });
});
