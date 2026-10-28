import { describe, expect, it } from "vitest";
import type { FileMetadata } from "@/app/atoms/metadata";
import { buildTagIndex, noteHasTag, noteMatchesFilter } from "./tag-index";

const task = (status: string) => ({ status }) as FileMetadata["tasks"][number];
const note = (path: string, tags: string[], tasks: FileMetadata["tasks"] = []) =>
  ({ path, name: path, tags, links: [], frontmatter: {}, modifiedAt: 1, wordCount: 1, tasks, handle: null }) as FileMetadata;

const index = (notes: FileMetadata[], hidden: string[] = []) =>
  buildTagIndex(Object.fromEntries(notes.map((meta) => [meta.path, meta])), { has: (path) => !hidden.includes(path) });

describe("buildTagIndex", () => {
  it("nests tags on / and rolls each parent's count up, counting a note once", () => {
    const { tree } = index([
      note("a.md", ["work/plans", "work/ideas"]),
      note("b.md", ["work"]),
      note("c.md", ["home"]),
    ]);
    expect(tree.map((node) => [node.path, node.count])).toEqual([["home", 1], ["work", 2]]);
    const work = tree.find((node) => node.path === "work")!;
    expect(work.children.map((node) => [node.name, node.path, node.count])).toEqual([
      ["ideas", "work/ideas", 1],
      ["plans", "work/plans", 1],
    ]);
  });

  it("lists every tag with its own note count, sorted", () => {
    const { tags } = index([note("a.md", ["b", "a"]), note("c.md", ["b"])]);
    expect(tags).toEqual([{ tag: "a", count: 1 }, { tag: "b", count: 2 }]);
  });

  it("counts the system filters", () => {
    const { filterCounts } = index([
      note("a.md", ["x"], [task("todo")]),
      note("b.md", [], [task("done")]),
      note("c.md", [], [task("prog")]),
    ]);
    expect(filterCounts).toEqual({ all: 3, untagged: 2, todo: 2 });
  });

  it("leaves out notes a listing may not show", () => {
    const { tags, filterCounts } = index([note("a.md", ["x"]), note("secret.md", ["x", "y"])], ["secret.md"]);
    expect(tags).toEqual([{ tag: "x", count: 1 }]);
    expect(filterCounts.all).toBe(1);
  });
});

describe("note matching", () => {
  it("matches untagged and notes with an open task", () => {
    expect(noteMatchesFilter(note("a.md", []), "untagged")).toBe(true);
    expect(noteMatchesFilter(note("a.md", ["x"]), "untagged")).toBe(false);
    expect(noteMatchesFilter(note("a.md", [], [task("cancelled")]), "todo")).toBe(false);
    expect(noteMatchesFilter(note("a.md", [], [task("hold")]), "todo")).toBe(true);
  });

  it("matches a tag by itself or any tag nested below it", () => {
    expect(noteHasTag(note("a.md", ["work/plans"]), "work")).toBe(true);
    expect(noteHasTag(note("a.md", ["workshop"]), "work")).toBe(false);
  });
});
