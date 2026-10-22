// @vitest-environment node
import { createStore } from "jotai";
import { describe, it, expect, beforeEach } from "vitest";
import {
  atom_workspaceLayout,
  atom_activePaneId,
  atom_closeTab,
  atom_reorderOpenNote,
  atom_activateWorkspaceTab,
  atom_workspaceTabs,
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

  it("reorders an open note without changing the note in front", () => {
    const layout = store.get(atom_workspaceLayout);
    const paneId = layout.rootContainer.id;
    store.set(atom_workspaceLayout, {
      ...layout,
      rootContainer: { ...layout.rootContainer, openFilePaths: ["a.md", "b.md", "c.md"], activeFilePath: "b.md" } as PanelLeaf,
    });

    store.set(atom_reorderOpenNote, { paneId, filePath: "c.md", targetIndex: 0 });
    const leaf = store.get(atom_workspaceLayout).rootContainer as PanelLeaf;
    expect(leaf.openFilePaths).toEqual(["c.md", "a.md", "b.md"]);
    expect(leaf.activeFilePath).toBe("b.md");
    expect(store.get(atom_workspaceTabs).map((tab) => tab.filePath)).toEqual(["c.md", "a.md", "b.md"]);

    // Out-of-range targets clamp; a note that isn't open is ignored.
    store.set(atom_reorderOpenNote, { paneId, filePath: "c.md", targetIndex: 99 });
    expect((store.get(atom_workspaceLayout).rootContainer as PanelLeaf).openFilePaths).toEqual(["a.md", "b.md", "c.md"]);
    store.set(atom_reorderOpenNote, { paneId, filePath: "x.md", targetIndex: 0 });
    expect((store.get(atom_workspaceLayout).rootContainer as PanelLeaf).openFilePaths).toEqual(["a.md", "b.md", "c.md"]);
  });

  it("enumerates the pane's tabs and activates the selected one", () => {
    const layout = store.get(atom_workspaceLayout);
    store.set(atom_workspaceLayout, {
      ...layout,
      rootContainer: { id: "pane", openFilePaths: ["one.md", "two.md", "three.md"], activeFilePath: "one.md", isPinned: false },
    });

    expect(store.get(atom_workspaceTabs)).toEqual([
      { paneId: "pane", filePath: "one.md" },
      { paneId: "pane", filePath: "two.md" },
      { paneId: "pane", filePath: "three.md" },
    ]);

    store.set(atom_activateWorkspaceTab, 2);
    expect(store.get(atom_workspaceLayout).rootContainer.activeFilePath).toBe("three.md");
  });

  it("does not activate tabs beyond the first nine workspace shortcuts", () => {
    const paths = Array.from({ length: 10 }, (_, index) => `file-${index + 1}.md`);
    const layout = store.get(atom_workspaceLayout);
    store.set(atom_workspaceLayout, {
      ...layout,
      rootContainer: {
        ...layout.rootContainer,
        openFilePaths: paths,
        activeFilePath: paths[0],
      } as PanelLeaf,
    });

    store.set(atom_activateWorkspaceTab, 9);

    expect((store.get(atom_workspaceLayout).rootContainer as PanelLeaf).activeFilePath).toBe(paths[0]);
  });
});
