import { afterEach, describe, expect, it } from "vitest";
import { setActiveMountNames } from "@/app/services/library-roots";
import { treeItems, type PendingCreate } from "./TreeNodes";
import { buildFileTree, flattenVisible } from "./tree-model";

const file = (path: string) => ({ name: path.split("/").pop(), kind: "file", path, handle: {} });
const tree = buildFileTree([file("a/one.md"), file("top.md")], ["a", "b"]);
const pending = (parentPath: string): PendingCreate => ({ kind: "file", parentPath, editing: { initialValue: "", onCancel: () => {}, onCommit: () => {} } as never });
const shape = (items: ReturnType<typeof treeItems>) => items.map((item) =>
  item.kind === "pending" ? `pending@${item.depth}` : item.kind === "section" ? `section:${item.name}` : `${item.row.path}@${item.row.depth}`);

describe("treeItems", () => {
  const open = () => false;

  it("lists the visible rows flat, with their depth", () => {
    expect(shape(treeItems(flattenVisible(tree, open), null, open))).toEqual(["a@0", "a/one.md@1", "b@0", "top.md@0"]);
  });

  it("puts the item being named first in its open folder, or at the top for the root", () => {
    expect(shape(treeItems(flattenVisible(tree, open), pending("a"), open))[1]).toBe("pending@1");
    expect(shape(treeItems(flattenVisible(tree, open), pending("b"), open))[3]).toBe("pending@1");
    expect(shape(treeItems(flattenVisible(tree, open), pending(""), open))[0]).toBe("pending@0");
  });

  it("leaves it out while its folder is collapsed", () => {
    const collapsed = (path: string) => path === "a";
    expect(shape(treeItems(flattenVisible(tree, collapsed), pending("a"), collapsed))).not.toContain("pending@1");
  });
});

describe("treeItems in a library", () => {
  afterEach(() => setActiveMountNames([]));
  const open = () => false;

  it("heads the vault's files with its name, and lines an added folder's notes up with them", () => {
    setActiveMountNames(["Work"]);
    const library = buildFileTree([file("top.md"), file("Work/plans/b.md"), file("Work/c.md")], ["Work", "Work/plans"]);
    expect(shape(treeItems(flattenVisible(library, open), null, open, "Notes"))).toEqual([
      "section:Notes", "top.md@0", "Work@0", "Work/plans@0", "Work/plans/b.md@1", "Work/c.md@0",
    ]);
  });

  it("names a new item at the added folder's level, and a root one under the vault's header", () => {
    setActiveMountNames(["Work"]);
    const library = buildFileTree([file("top.md"), file("Work/c.md")], ["Work"]);
    const rows = flattenVisible(library, open);
    expect(shape(treeItems(rows, pending("Work"), open, "Notes"))).toContain("pending@0");
    expect(shape(treeItems(rows, pending(""), open, "Notes")).slice(0, 2)).toEqual(["section:Notes", "pending@0"]);
  });

  it("has no header for a plain vault", () => {
    expect(shape(treeItems(flattenVisible(tree, open), null, open, null))[0]).toBe("a@0");
  });
});
