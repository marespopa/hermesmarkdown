import { describe, expect, it } from "vitest";
import type { PanelLeaf } from "@/app/types/workspace";
import { findLeaf, removePathsFromLayout } from "./utils";

const leaf = (openFilePaths: string[], activeFilePath?: string): PanelLeaf =>
  ({ id: "p", openFilePaths, activeFilePath, isPinned: false });

describe("findLeaf", () => {
  it("returns the pane only for its own id", () => {
    expect(findLeaf(leaf([]), "p")?.id).toBe("p");
    expect(findLeaf(leaf([]), "other")).toBeNull();
    expect(findLeaf(leaf([]), null)).toBeNull();
  });
});

describe("removePathsFromLayout", () => {
  it("drops matching tabs and moves the front to the last one left", () => {
    expect(removePathsFromLayout(leaf(["a.md", "b.md", "c.md"], "b.md"), (p) => p === "b.md"))
      .toMatchObject({ openFilePaths: ["a.md", "c.md"], activeFilePath: "c.md" });
  });

  it("falls back to the draft when nothing is left", () => {
    expect(removePathsFromLayout(leaf(["a.md"], "a.md"), () => true))
      .toMatchObject({ openFilePaths: ["draft"], activeFilePath: "draft" });
  });
});
