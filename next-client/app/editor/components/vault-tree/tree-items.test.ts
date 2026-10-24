import { describe, expect, it } from "vitest";
import { treeItems, type PendingCreate } from "./TreeNodes";
import { buildFileTree, flattenVisible } from "./tree-model";

const file = (path: string) => ({ name: path.split("/").pop(), kind: "file", path, handle: {} });
const tree = buildFileTree([file("a/one.md"), file("top.md")], ["a", "b"]);
const pending = (parentPath: string): PendingCreate => ({ kind: "file", parentPath, editing: { initialValue: "", onCancel: () => {}, onCommit: () => {} } as never });
const shape = (items: ReturnType<typeof treeItems>) => items.map((item) => (item.kind === "pending" ? `pending@${item.depth}` : `${item.row.path}@${item.row.depth}`));

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
