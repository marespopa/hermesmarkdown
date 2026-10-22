// @vitest-environment node
import { createStore } from "jotai";
import { describe, it, expect, beforeEach } from "vitest";
import { atom_workspaceLayout, atom_activePaneId, atom_dockNote, atom_dockPane, findLeaf } from "./atoms";
import type { PanelLeaf, WorkspaceContainer } from "../types/workspace";

const leaf = (id: string, paths: string[], extra: Partial<PanelLeaf> = {}): PanelLeaf => ({
  id,
  type: "editor",
  openFilePaths: paths,
  activeFilePath: paths[paths.length - 1],
  isPinned: false,
  ...extra,
});

function seed(store: ReturnType<typeof createStore>, root: PanelLeaf | WorkspaceContainer) {
  store.set(atom_workspaceLayout, { version: 2, rootContainer: root });
}

const twoPanes = (a: PanelLeaf, b: PanelLeaf): WorkspaceContainer => ({
  id: "root",
  direction: "horizontal",
  sizes: [50, 50],
  children: [a, b],
});

describe("atom_dockNote", () => {
  let store: ReturnType<typeof createStore>;
  beforeEach(() => {
    store = createStore();
  });

  it("moves an Open Notes note to a new pane on an edge", () => {
    seed(store, twoPanes(leaf("a", ["x.md", "y.md"]), leaf("b", ["z.md"])));
    const id = store.set(atom_dockNote, { path: "y.md", targetPaneId: "b", zone: "bottom", sourcePaneId: "a" });
    const root = store.get(atom_workspaceLayout).rootContainer;
    expect(findLeaf(root, "a")?.openFilePaths).toEqual(["x.md"]);
    const created = findLeaf(root, id as string);
    expect(created?.openFilePaths).toEqual(["y.md"]);
    expect(created?.activeFilePath).toBe("y.md");
    expect(store.get(atom_activePaneId)).toBe(id);
  });

  it("keeps the note in its only-note source pane too", () => {
    seed(store, twoPanes(leaf("a", ["x.md"]), leaf("b", ["z.md"])));
    const id = store.set(atom_dockNote, { path: "x.md", targetPaneId: "b", zone: "right", sourcePaneId: "a" });
    const root = store.get(atom_workspaceLayout).rootContainer;
    expect(findLeaf(root, "a")?.openFilePaths).toEqual(["x.md"]);
    expect(findLeaf(root, id as string)?.openFilePaths).toEqual(["x.md"]);
  });

  it("appends and fronts the note on a center drop", () => {
    seed(store, twoPanes(leaf("a", ["x.md", "y.md"]), leaf("b", ["z.md"])));
    store.set(atom_dockNote, { path: "x.md", targetPaneId: "b", zone: "center", sourcePaneId: "a" });
    const root = store.get(atom_workspaceLayout).rootContainer;
    expect(findLeaf(root, "b")?.openFilePaths).toEqual(["z.md", "x.md"]);
    expect(findLeaf(root, "b")?.activeFilePath).toBe("x.md");
    expect(findLeaf(root, "a")?.openFilePaths).toEqual(["y.md"]);
    expect(store.get(atom_activePaneId)).toBe("b");
  });

  it("does nothing for a center drop on the source pane", () => {
    seed(store, twoPanes(leaf("a", ["x.md", "y.md"]), leaf("b", ["z.md"])));
    const before = store.get(atom_workspaceLayout);
    expect(store.set(atom_dockNote, { path: "x.md", targetPaneId: "a", zone: "center", sourcePaneId: "a" })).toBeNull();
    expect(store.get(atom_workspaceLayout)).toBe(before);
  });

  it("creates an empty active leaf for a file edge drop", () => {
    seed(store, twoPanes(leaf("a", ["x.md"]), leaf("b", ["z.md"])));
    const id = store.set(atom_dockNote, { path: "new.md", targetPaneId: "a", zone: "left" });
    const created = findLeaf(store.get(atom_workspaceLayout).rootContainer, id as string);
    expect(created?.openFilePaths).toEqual([]);
    expect(store.get(atom_activePaneId)).toBe(id);
  });
});

describe("atom_dockPane", () => {
  let store: ReturnType<typeof createStore>;
  beforeEach(() => {
    store = createStore();
  });

  const three = () =>
    ({
      id: "root",
      direction: "horizontal",
      sizes: [50, 50],
      children: [
        twoPanes(leaf("a", ["a.md"], { type: "preview" }), leaf("b", ["b.md", "c.md"])),
        leaf("c", ["c.md", "d.md"]),
      ],
    }) as WorkspaceContainer;

  it("relocates a pane to an edge keeping notes and type, collapsing its old parent", () => {
    seed(store, three());
    const id = store.set(atom_dockPane, { paneId: "a", targetPaneId: "c", zone: "top" });
    expect(id).toBe("a");
    const root = store.get(atom_workspaceLayout).rootContainer as WorkspaceContainer;
    // Old parent collapsed: "b" is now a direct child of the root.
    expect(root.children.map((child) => child.id)).toContain("b");
    const moved = findLeaf(root, "a");
    expect(moved).toMatchObject({ type: "preview", openFilePaths: ["a.md"], activeFilePath: "a.md" });
    expect(store.get(atom_activePaneId)).toBe("a");
  });

  it("merges notes without duplicates on center and closes the source", () => {
    seed(store, three());
    store.set(atom_dockPane, { paneId: "b", targetPaneId: "c", zone: "center" });
    const root = store.get(atom_workspaceLayout).rootContainer;
    expect(findLeaf(root, "b")).toBeNull();
    expect(findLeaf(root, "c")?.openFilePaths).toEqual(["c.md", "d.md", "b.md"]);
    expect(findLeaf(root, "c")?.activeFilePath).toBe("c.md");
    expect(store.get(atom_activePaneId)).toBe("c");
  });

  it("is a no-op on itself or with a single pane", () => {
    seed(store, three());
    const before = store.get(atom_workspaceLayout);
    expect(store.set(atom_dockPane, { paneId: "a", targetPaneId: "a", zone: "left" })).toBeNull();
    expect(store.get(atom_workspaceLayout)).toBe(before);

    seed(store, leaf("only", ["x.md"]));
    const single = store.get(atom_workspaceLayout);
    expect(store.set(atom_dockPane, { paneId: "only", targetPaneId: "only", zone: "left" })).toBeNull();
    expect(store.get(atom_workspaceLayout)).toBe(single);
  });
});
