import { atom } from "jotai";
import type { DockZone, PanelLeaf } from "@/app/types/workspace";
import { atom_workspaceLayout, atom_activePaneId } from "./workspace-atoms";
import { findLeaf, updateLeaf, generateId } from "./utils";
import { detachLeaf, insertLeafAt } from "./layout-tree";

// A note leaves a pane unless it is the pane's last one (then it stays, so no
// pane is left empty and the note shows in both).
function withoutNote(leaf: PanelLeaf, path: string): Partial<PanelLeaf> {
  if (leaf.openFilePaths.length <= 1 || !leaf.openFilePaths.includes(path)) return {};
  const openFilePaths = leaf.openFilePaths.filter((p) => p !== path);
  return {
    openFilePaths,
    activeFilePath:
      leaf.activeFilePath === path ? openFilePaths[openFilePaths.length - 1] : leaf.activeFilePath,
  };
}

// Drops a note on a pane: an edge splits it with a new pane, the center opens
// the note in it. With `sourcePaneId` (an Open Notes row) the note moves
// there from its pane (copied when it was that pane's only note). Without it
// (a Files tree row) the new pane is empty and active, and the caller opens
// the file. Returns the pane the note is now in, or null for a no-op.
export const atom_dockNote = atom(
  null,
  (
    get,
    set,
    { path, targetPaneId, zone, sourcePaneId }: { path: string; targetPaneId: string; zone: DockZone; sourcePaneId?: string },
  ): string | null => {
    const layout = get(atom_workspaceLayout);
    let root = layout.rootContainer;
    const target = findLeaf(root, targetPaneId);
    if (!target) return null;
    const source = sourcePaneId ? findLeaf(root, sourcePaneId) : null;

    if (zone === "center") {
      if (!sourcePaneId) {
        set(atom_activePaneId, targetPaneId);
        return targetPaneId;
      }
      if (!source || sourcePaneId === targetPaneId) return null;
      root = updateLeaf(root, sourcePaneId, withoutNote(source, path));
      root = updateLeaf(root, targetPaneId, {
        openFilePaths: [...target.openFilePaths.filter((p) => p !== path), path],
        activeFilePath: path,
      });
      set(atom_workspaceLayout, { ...layout, rootContainer: root });
      set(atom_activePaneId, targetPaneId);
      return targetPaneId;
    }

    if (source && sourcePaneId) root = updateLeaf(root, sourcePaneId, withoutNote(source, path));
    const newLeaf: PanelLeaf = {
      id: generateId(),
      type: "editor",
      openFilePaths: source ? [path] : [],
      activeFilePath: source ? path : undefined,
      isPinned: false,
    };
    set(atom_workspaceLayout, { ...layout, rootContainer: insertLeafAt(root, targetPaneId, zone, newLeaf) });
    set(atom_activePaneId, newLeaf.id);
    return newLeaf.id;
  },
);

// Drops a whole pane (dragged by its grip) on another: an edge relocates it
// beside the target keeping its notes, type and front note; the center merges
// its notes into the target and closes it. Its old split collapses (and its
// scroll lock goes with it).
export const atom_dockPane = atom(
  null,
  (
    get,
    set,
    { paneId, targetPaneId, zone }: { paneId: string; targetPaneId: string; zone: DockZone },
  ): string | null => {
    const layout = get(atom_workspaceLayout);
    if (paneId === targetPaneId || "type" in layout.rootContainer) return null;
    if (!findLeaf(layout.rootContainer, targetPaneId)) return null;

    const { root, leaf } = detachLeaf(layout.rootContainer, paneId);
    if (!root || !leaf) return null;

    if (zone === "center") {
      const target = findLeaf(root, targetPaneId);
      if (!target) return null;
      const merged = updateLeaf(root, targetPaneId, {
        openFilePaths: [...target.openFilePaths, ...leaf.openFilePaths.filter((p) => !target.openFilePaths.includes(p))],
        activeFilePath: leaf.activeFilePath ?? target.activeFilePath,
      });
      set(atom_workspaceLayout, { ...layout, rootContainer: merged });
      set(atom_activePaneId, targetPaneId);
      return targetPaneId;
    }

    set(atom_workspaceLayout, { ...layout, rootContainer: insertLeafAt(root, targetPaneId, zone, leaf) });
    set(atom_activePaneId, leaf.id);
    return leaf.id;
  },
);
