// @vitest-environment node
import { createStore } from "jotai";
import { describe, it, expect, beforeEach } from "vitest";
import {
  atom_workspaceLayout,
  atom_activePaneId,
  atom_closeTab,
} from "./atoms";
import { PanelLeaf } from "../types/workspace";

describe("layout-actions", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  it("always reports the one pane as active, ignoring writes", () => {
    const layout = store.get(atom_workspaceLayout);
    store.set(atom_workspaceLayout, { ...layout, rootContainer: { ...layout.rootContainer, id: "only" } });
    expect(store.get(atom_activePaneId)).toBe("only");
    store.set(atom_activePaneId, "elsewhere");
    expect(store.get(atom_activePaneId)).toBe("only");
  });

  it("should close a tab and update activeFilePath if necessary", () => {
    const paneId = "default-pane";
    const fileA = "a.md";
    const fileB = "b.md";
    
    const layout = store.get(atom_workspaceLayout);
    store.set(atom_workspaceLayout, {
      ...layout,
      rootContainer: {
        ...layout.rootContainer,
        openFilePaths: [fileA, fileB],
        activeFilePath: fileB
      } as PanelLeaf
    });
    
    store.set(atom_closeTab, { paneId, filePath: fileB });
    
    const newLayout = store.get(atom_workspaceLayout);
    const leaf = newLayout.rootContainer as PanelLeaf;
    expect(leaf.openFilePaths).toEqual([fileA]);
    expect(leaf.activeFilePath).toBe(fileA);
  });
});
