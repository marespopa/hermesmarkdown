import { afterEach, describe, expect, it } from "vitest";
import { setActiveMountNames } from "@/app/services/library-roots";
import { ancestorPaths, buildFileTree, canDropInto, type DraggedEntry, flattenVisible } from "./tree-model";

const file = (path: string) => ({ name: path.split("/").pop(), path, handle: {} });

describe("flattenVisible", () => {
  it("lists rows top to bottom, leaving out the insides of closed folders", () => {
    const tree = buildFileTree([file("a.md"), file("notes/b.md"), file("notes/deep/c.md")], ["empty"]);
    const open = flattenVisible(tree, () => false).map((row) => `${row.depth}:${row.path}`);
    expect(open).toEqual(["0:empty", "0:notes", "1:notes/deep", "2:notes/deep/c.md", "1:notes/b.md", "0:a.md"]);

    const closed = flattenVisible(tree, (path) => path === "notes").map((row) => row.path);
    expect(closed).toEqual(["empty", "notes", "a.md"]);
  });
});

describe("ancestorPaths", () => {
  it("lists the folders above a path, outermost first", () => {
    expect(ancestorPaths("a/b/c.md")).toEqual(["a", "a/b"]);
    expect(ancestorPaths("c.md")).toEqual([]);
  });
});

describe("canDropInto", () => {
  const entry = (kind: "file" | "folder", path: string): DraggedEntry => ({ kind, path, name: path.split("/").pop()! });

  it("allows a group when some item would move and no folder goes into itself", () => {
    const group = { ...entry("file", "a.md"), group: [entry("file", "a.md"), entry("file", "notes/b.md")] };
    expect(canDropInto(group, "notes")).toBe(true);
    expect(canDropInto(group, "archive")).toBe(true);

    const withFolder = { ...entry("folder", "notes"), group: [entry("folder", "notes"), entry("file", "a.md")] };
    expect(canDropInto(withFolder, "notes/deep")).toBe(false);

    const allHere = { ...entry("file", "notes/a.md"), group: [entry("file", "notes/a.md"), entry("file", "notes/b.md")] };
    expect(canDropInto(allHere, "notes")).toBe(false);
  });
});

describe("canDropInto a library", () => {
  afterEach(() => setActiveMountNames([]));

  it("offers no drop target in another folder of the library", () => {
    setActiveMountNames(["Work"]);
    const note: DraggedEntry = { kind: "file", path: "notes/a.md", name: "a.md" };
    const workNote: DraggedEntry = { kind: "file", path: "Work/b.md", name: "b.md" };
    expect(canDropInto(note, "Work")).toBe(false);
    expect(canDropInto(note, "Work/plans")).toBe(false);
    expect(canDropInto(workNote, "")).toBe(false);
    expect(canDropInto(workNote, "notes")).toBe(false);
    expect(canDropInto(workNote, "Work/plans")).toBe(true);
    expect(canDropInto(note, "")).toBe(true);
  });
});
