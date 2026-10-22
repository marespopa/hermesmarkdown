// @vitest-environment node
import { describe, it, expect } from "vitest";
import type { PanelLeaf, WorkspaceContainer } from "@/app/types/workspace";
import { detachLeaf, findParent, insertLeafAt, lockablePair, setContainer } from "./layout-tree";

const leaf = (id: string): PanelLeaf => ({ id, type: "editor", openFilePaths: [], isPinned: false });
const pair = (id: string, a: PanelLeaf | WorkspaceContainer, b: PanelLeaf | WorkspaceContainer): WorkspaceContainer => ({
  id,
  direction: "horizontal",
  sizes: [50, 50],
  children: [a, b],
});

describe("layout-tree", () => {
  it.each([
    ["left", "horizontal", ["new", "t"]],
    ["right", "horizontal", ["t", "new"]],
    ["top", "vertical", ["new", "t"]],
    ["bottom", "vertical", ["t", "new"]],
  ] as const)("insertLeafAt %s", (zone, direction, order) => {
    const root = insertLeafAt(leaf("t"), "t", zone, leaf("new")) as WorkspaceContainer;
    expect(root.direction).toBe(direction);
    expect(root.sizes).toEqual([50, 50]);
    expect(root.children.map((c) => c.id)).toEqual(order);
  });

  it("insertLeafAt clears the parent's scroll lock", () => {
    const root = { ...pair("p", leaf("a"), leaf("b")), scrollLock: true };
    const next = insertLeafAt(root, "a", "bottom", leaf("n")) as WorkspaceContainer;
    expect(next.scrollLock).toBeUndefined();
  });

  it("detachLeaf collapses the parent and returns the leaf", () => {
    const root = pair("p", pair("q", leaf("a"), leaf("b")), leaf("c"));
    const result = detachLeaf(root, "a");
    expect(result.leaf?.id).toBe("a");
    const next = result.root as WorkspaceContainer;
    expect(next.children.map((c) => c.id)).toEqual(["b", "c"]);
  });

  it("detachLeaf on the root leaf gives a null root", () => {
    const result = detachLeaf(leaf("a"), "a");
    expect(result.root).toBeNull();
    expect(result.leaf?.id).toBe("a");
  });

  it("lockablePair is the parent only when both children are leaves", () => {
    const root = pair("p", pair("q", leaf("a"), leaf("b")), leaf("c"));
    expect(lockablePair(root, "c")).toBeNull();
    expect(lockablePair(root, "a")?.id).toBe("q");
    expect(lockablePair(leaf("a"), "a")).toBeNull();
  });

  it("findParent and setContainer find nested containers", () => {
    const root = pair("p", pair("q", leaf("a"), leaf("b")), leaf("c"));
    expect(findParent(root, "b")?.id).toBe("q");
    const next = setContainer(root, "q", { sizes: [70, 30] }) as WorkspaceContainer;
    expect((next.children[0] as WorkspaceContainer).sizes).toEqual([70, 30]);
  });
});
