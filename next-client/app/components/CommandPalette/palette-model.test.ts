// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildContentRows, type FileResult, scopeFromPrefix, scopePrefix } from "./palette-model";

const file = (path: string): FileResult => ({
  path,
  name: path.split("/").pop()!,
  handle: { kind: "file", name: path } as unknown as FileSystemFileHandle,
  tags: [],
  isSensitive: false,
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
