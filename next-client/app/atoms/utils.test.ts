import { describe, expect, it } from "vitest";
import type { PanelLeaf, WorkspaceContainer } from "@/app/types/workspace";
import { isOnLeadingEdge } from "./utils";

const leaf = (id: string): PanelLeaf => ({ id, type: "editor", openFilePaths: [], isPinned: false });
const split = (direction: "horizontal" | "vertical", children: (WorkspaceContainer | PanelLeaf)[]): WorkspaceContainer =>
  ({ id: `${direction}-split`, direction, sizes: children.map(() => 100 / children.length), children });

describe("isOnLeadingEdge", () => {
  it("counts a single pane", () => {
    expect(isOnLeadingEdge(leaf("a"), "a")).toBe(true);
  });

  it("counts only the first pane of a side-by-side split", () => {
    const layout = split("horizontal", [leaf("left"), leaf("right")]);
    expect(isOnLeadingEdge(layout, "left")).toBe(true);
    expect(isOnLeadingEdge(layout, "right")).toBe(false);
  });

  it("counts every pane of a stacked split on the leading side", () => {
    const layout = split("horizontal", [split("vertical", [leaf("top"), leaf("bottom")]), leaf("right")]);
    expect(isOnLeadingEdge(layout, "top")).toBe(true);
    expect(isOnLeadingEdge(layout, "bottom")).toBe(true);
    expect(isOnLeadingEdge(layout, "right")).toBe(false);
  });
});
