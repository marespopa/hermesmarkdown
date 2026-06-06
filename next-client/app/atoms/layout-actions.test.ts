import { createStore } from "jotai";
import { describe, it, expect, beforeEach } from "vitest";
import {
  atom_workspaceLayout,
  atom_activePaneId,
  atom_splitPane,
  atom_closePane,
  atom_closeTab,
  atom_moveTab
} from "./atoms";
import { WorkspaceContainer, PanelLeaf } from "../types/workspace";

describe("layout-actions", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  it("should split a pane and update activePaneId", () => {
    const initialLayout = store.get(atom_workspaceLayout);
    const initialPaneId = initialLayout.rootContainer.id;
    
    store.set(atom_splitPane, { id: initialPaneId, direction: "horizontal" });
    
    const newLayout = store.get(atom_workspaceLayout);
    // Root should now be a container with two children
    expect("direction" in newLayout.rootContainer).toBe(true);
    const container = newLayout.rootContainer as WorkspaceContainer;
    expect(container.direction).toBe("horizontal");
    expect(container.children).toHaveLength(2);
    expect(container.children[0].id).toBe(initialPaneId);
    
    const newPaneId = container.children[1].id;
    expect(store.get(atom_activePaneId)).toBe(newPaneId);
  });

  it("should close a pane and reassign activePaneId", () => {
    const initialPaneId = "default-pane";
    store.set(atom_splitPane, { id: initialPaneId, direction: "vertical" });
    
    const splitLayout = store.get(atom_workspaceLayout);
    const container = splitLayout.rootContainer as WorkspaceContainer;
    const newPaneId = container.children[1].id;
    
    expect(store.get(atom_activePaneId)).toBe(newPaneId);
    
    // Close the new pane
    store.set(atom_closePane, newPaneId);
    
    const finalLayout = store.get(atom_workspaceLayout);
    // Should be back to a single leaf
    expect("type" in finalLayout.rootContainer).toBe(true);
    expect(finalLayout.rootContainer.id).toBe(initialPaneId);
    expect(store.get(atom_activePaneId)).toBe(initialPaneId);
  });

  it("should not close the last remaining pane", () => {
    const initialPaneId = "default-pane";
    store.set(atom_closePane, initialPaneId);
    
    const layout = store.get(atom_workspaceLayout);
    expect(layout.rootContainer.id).toBe(initialPaneId);
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

  it("should move a tab within the same pane", () => {
    const paneId = "default-pane";
    const fileA = "a.md";
    const fileB = "b.md";
    const fileC = "c.md";
    
    const layout = store.get(atom_workspaceLayout);
    store.set(atom_workspaceLayout, {
      ...layout,
      rootContainer: {
        ...layout.rootContainer,
        openFilePaths: [fileA, fileB, fileC],
        activeFilePath: fileA
      } as PanelLeaf
    });
    
    // Move fileA to the end
    store.set(atom_moveTab, {
      sourcePaneId: paneId,
      targetPaneId: paneId,
      filePath: fileA,
      targetIndex: 2
    });
    
    const newLayout = store.get(atom_workspaceLayout);
    const leaf = newLayout.rootContainer as PanelLeaf;
    expect(leaf.openFilePaths).toEqual([fileB, fileC, fileA]);
    expect(leaf.activeFilePath).toBe(fileA);
  });

  it("should move a tab to a different pane", () => {
    const pane1Id = "default-pane";
    store.set(atom_splitPane, { id: pane1Id, direction: "horizontal" });
    
    const splitLayout = store.get(atom_workspaceLayout);
    const container = splitLayout.rootContainer as WorkspaceContainer;
    const pane2Id = container.children[1].id;
    
    const fileA = "a.md";
    const fileB = "b.md";
    
    // Setup: fileA in pane1, fileB in pane2
    store.set(atom_workspaceLayout, {
      rootContainer: {
        ...container,
        children: [
          { ...container.children[0], openFilePaths: [fileA], activeFilePath: fileA } as PanelLeaf,
          { ...container.children[1], openFilePaths: [fileB], activeFilePath: fileB } as PanelLeaf,
        ]
      }
    });
    
    // Move fileA from pane1 to pane2 at index 0
    store.set(atom_moveTab, {
      sourcePaneId: pane1Id,
      targetPaneId: pane2Id,
      filePath: fileA,
      targetIndex: 0
    });
    
    const finalLayout = store.get(atom_workspaceLayout);
    const finalContainer = finalLayout.rootContainer as WorkspaceContainer;
    const leaf1 = finalContainer.children[0] as PanelLeaf;
    const leaf2 = finalContainer.children[1] as PanelLeaf;
    
    expect(leaf1.openFilePaths).toEqual([]);
    expect(leaf2.openFilePaths).toEqual([fileA, fileB]);
    expect(leaf2.activeFilePath).toBe(fileA);
    expect(store.get(atom_activePaneId)).toBe(pane2Id);
  });
});
