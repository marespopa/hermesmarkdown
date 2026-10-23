// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildContentRows, buildTagRows, splitTagDetail, type FileResult, scopeFromPrefix, scopePrefix } from "./palette-model";

const file = (path: string): FileResult => ({
  path,
  name: path.split("/").pop()!,
  handle: { kind: "file", name: path } as unknown as FileSystemFileHandle,
  tags: [],
  isPrivate: false,
});

describe("palette scopes", () => {
  it("maps / to the note-text scope and keeps the other prefixes", () => {
    expect(scopeFromPrefix("/ foo bar")).toEqual({ scope: "content", query: "foo bar" });
    expect(scopePrefix("content")).toBe("/");
    expect(scopeFromPrefix("#tag")?.scope).toBe("tag");
    expect(scopeFromPrefix(">cmd")?.scope).toBe("command");
    expect(scopeFromPrefix("!task")?.scope).toBe("task");
    expect(scopeFromPrefix("@head")?.scope).toBe("heading");
    expect(scopeFromPrefix("plain")).toBeNull();
  });
});

describe("buildContentRows", () => {
  it("builds rows in hit order and drops hits without a listed file", () => {
    const notes = new Map([["dir/a.md", file("dir/a.md")]]);
    const rows = buildContentRows([
      { path: "dir/a.md", name: "a.md", line: 4, column: 2, snippet: "a needle", highlights: [2, 3], score: 130 },
      { path: "secret.md", name: "secret.md", line: 1, column: 0, snippet: "needle", highlights: [0], score: 200 },
    ], notes);
    expect(rows).toEqual([{
      kind: "content", id: "dir/a.md:4", label: "a needle", detail: "a.md:4", file: notes.get("dir/a.md"),
      line: 4, column: 2, titleIndices: [2, 3], detailIndices: [], score: 130,
    }]);
  });
});

describe("splitTagDetail", () => {
  it("splits the joined detail with indices relative to each tag", () => {
    expect(splitTagDetail("#a #bc", [1, 4, 5])).toEqual([
      { tag: "a", indices: [1] },
      { tag: "bc", indices: [1, 2] },
    ]);
  });

  it("lands on matched characters of its own tag for a two-tag query", () => {
    const file = { path: "n.md", name: "n.md" } as FileResult;
    const [row] = buildTagRows("#al #be", new Map([["alpha", [file]], ["beta", [file]]]));
    const parts = splitTagDetail(row.detail, row.detailIndices);
    expect(parts.map((part) => part.tag)).toEqual(["alpha", "beta"]);
    expect(parts[0].indices.map((i) => "#alpha"[i]).join("")).toBe("al");
    expect(parts[1].indices.map((i) => "#beta"[i]).join("")).toBe("be");
  });
});
