import { atom } from "jotai";
import { atom_workspaceLayout, atom_activePaneId } from "./workspace-atoms";
import { findLeaf, updateLeaf, generateId, getWorkspaceTabs } from "./utils";
import { atom_openFiles } from "./file-atoms";
import { forgetClosedFiles } from "./tab-limit";
import { WorkspaceContainer, PanelLeaf, PaneType } from "@/app/types/workspace";
import { lockablePair, setContainer } from "./layout-tree";

export const atom_workspaceTabs = atom((get) =>
  getWorkspaceTabs(get(atom_workspaceLayout).rootContainer),
);

export const atom_activateWorkspaceTab = atom(
  null,
  (get, set, index: number) => {
    if (index < 0 || index >= 9) return;

    const layout = get(atom_workspaceLayout);
    const tab = getWorkspaceTabs(layout.rootContainer)[index];
    if (!tab) return;

    set(atom_workspaceLayout, {
      ...layout,
      rootContainer: updateLeaf(layout.rootContainer, tab.paneId, {
        activeFilePath: tab.filePath,
      }),
    });
    set(atom_activePaneId, tab.paneId);
  },
);

export const atom_splitPane = atom(
  null,
  (
    get,
    set,
    {
      id,
      direction,
      filePath,
      type = "editor",
      copy = false,
      focusNew = true,
      scrollLock,
    }: {
      id: string;
      direction: "horizontal" | "vertical";
      filePath?: string;
      type?: PaneType;
      copy?: boolean; // keep filePath in the source pane too
      focusNew?: boolean;
      scrollLock?: boolean;
    },
  ) => {
    const layout = get(atom_workspaceLayout);
    const leaf = findLeaf(layout.rootContainer, id);
    if (!leaf) return;

    const newLeafId = generateId();
    const newLeaf: PanelLeaf = {
      ...leaf,
      id: newLeafId,
      type,
      openFilePaths: filePath ? [filePath] : [...leaf.openFilePaths],
      activeFilePath: filePath ?? leaf.activeFilePath,
    };

    const sourceLeaf: PanelLeaf = filePath && !copy
      ? {
          ...leaf,
          openFilePaths: leaf.openFilePaths.filter((path) => path !== filePath),
          activeFilePath:
            leaf.activeFilePath === filePath
              ? leaf.openFilePaths.find((path) => path !== filePath)
              : leaf.activeFilePath,
        }
      : leaf;

    const splitNode = (
      node: WorkspaceContainer | PanelLeaf,
    ): WorkspaceContainer | PanelLeaf => {
      if ("type" in node) {
        if (node.id === id) {
          return {
            id: generateId(),
            direction,
            sizes: [50, 50],
            children: [sourceLeaf, newLeaf],
            ...(scrollLock ? { scrollLock: true } : {}),
          } as WorkspaceContainer;
        }
        return node;
      }
      // A scroll lock pairs exactly two panes: splitting one of them voids it.
      const { scrollLock: parentLock, ...rest } = node;
      const pairBroken = node.children.some((child) => child.id === id);
      return {
        ...(pairBroken ? rest : { ...rest, ...(parentLock ? { scrollLock: parentLock } : {}) }),
        children: node.children.map((child) => splitNode(child)),
      } as WorkspaceContainer;
    };

    set(atom_workspaceLayout, {
      ...layout,
      rootContainer: splitNode(layout.rootContainer),
    });
    if (focusNew) set(atom_activePaneId, newLeafId);
  },
);

function findContainerSizes(node: WorkspaceContainer | PanelLeaf, id: string): number[] | null {
  if ("type" in node) return null;
  if (node.id === id) return node.sizes;
  for (const child of node.children) {
    const found = findContainerSizes(child, id);
    if (found) return found;
  }
  return null;
}

// Persists divider positions (percentages) after a drag ends.
export const atom_setSplitSizes = atom(
  null,
  (get, set, { containerId, sizes }: { containerId: string; sizes: number[] }) => {
    const layout = get(atom_workspaceLayout);
    if (!sizes.every(Number.isFinite) || sizes.reduce((a, b) => a + b, 0) <= 0 || sizes.some((s) => s <= 0)) return;
    const current = findContainerSizes(layout.rootContainer, containerId);
    // The group reports its layout on mount too: unchanged sizes aren't a write.
    if (current && current.length === sizes.length && current.every((s, i) => Math.abs(s - sizes[i]) < 0.01)) return;
    set(atom_workspaceLayout, {
      ...layout,
      rootContainer: setContainer(layout.rootContainer, containerId, { sizes }),
    });
  },
);

export const atom_setPaneType = atom(
  null,
  (get, set, { paneId, type }: { paneId: string; type: PaneType }) => {
    const layout = get(atom_workspaceLayout);
    if (!findLeaf(layout.rootContainer, paneId)) return;
    set(atom_workspaceLayout, {
      ...layout,
      rootContainer: updateLeaf(layout.rootContainer, paneId, { type }),
    });
  },
);

// Flips scroll lock on the split holding `paneId`, if it is a two-pane split.
export const atom_toggleScrollLock = atom(null, (get, set, paneId: string) => {
  const layout = get(atom_workspaceLayout);
  const pair = lockablePair(layout.rootContainer, paneId);
  if (!pair) return;
  set(atom_workspaceLayout, {
    ...layout,
    rootContainer: setContainer(layout.rootContainer, pair.id, { scrollLock: !pair.scrollLock }),
  });
});

export const atom_closePane = atom(null, (get, set, id: string) => {
  const layout = get(atom_workspaceLayout);

  // Don't close the last pane
  if ("type" in layout.rootContainer) return;

  const removeNode = (
    node: WorkspaceContainer | PanelLeaf,
  ): WorkspaceContainer | PanelLeaf | null => {
    if ("type" in node) {
      return node.id === id ? null : node;
    }

    const newChildren = node.children
      .map((child) => removeNode(child))
      .filter(
        (child): child is WorkspaceContainer | PanelLeaf => child !== null,
      );

    if (newChildren.length === 0) return null;
    if (newChildren.length === 1) return newChildren[0];

    return {
      ...node,
      children: newChildren,
      sizes: newChildren.map(() => 100 / newChildren.length),
    } as WorkspaceContainer;
  };

  const newRoot = removeNode(layout.rootContainer);
  if (newRoot) {
    set(atom_workspaceLayout, { ...layout, rootContainer: newRoot });
    // Reset active pane to something that exists
    const firstLeaf = (node: WorkspaceContainer | PanelLeaf): string => {
      if ("type" in node) return node.id;
      return firstLeaf(node.children[0]);
    };
    set(atom_activePaneId, firstLeaf(newRoot));
  }
});

export const atom_closeTab = atom(
  null,
  (get, set, { paneId, filePath }: { paneId: string; filePath: string }) => {
    const layout = get(atom_workspaceLayout);
    const leaf = findLeaf(layout.rootContainer, paneId);
    if (!leaf) return;

    const newOpenFilePaths = leaf.openFilePaths.filter((p) => p !== filePath);
    let newActiveFilePath = leaf.activeFilePath;

    if (newActiveFilePath === filePath) {
      newActiveFilePath =
        newOpenFilePaths[newOpenFilePaths.length - 1] || undefined;
    }

    const rootContainer = updateLeaf(layout.rootContainer, paneId, {
      openFilePaths: newOpenFilePaths,
      activeFilePath: newActiveFilePath,
    });
    set(atom_workspaceLayout, { ...layout, rootContainer });
    // A note no pane shows any more drops its cached text, unless it has
    // unsaved changes (closing with autosave on saves those first).
    set(atom_openFiles, (prev) => forgetClosedFiles(prev, rootContainer, [filePath]));
  },
);

// Moves an open note to `targetIndex` among its pane's notes (dragged in the
// sidebar's Open Notes), which renumbers the Ctrl/Cmd+1–9 shortcuts. Unlike
// atom_moveTab it leaves the note in front and the focused pane alone.
export const atom_reorderOpenNote = atom(
  null,
  (get, set, { paneId, filePath, targetIndex }: { paneId: string; filePath: string; targetIndex: number }) => {
    const layout = get(atom_workspaceLayout);
    const leaf = findLeaf(layout.rootContainer, paneId);
    const from = leaf?.openFilePaths.indexOf(filePath) ?? -1;
    if (!leaf || from < 0) return;
    const paths = leaf.openFilePaths.filter((p) => p !== filePath);
    const to = Math.max(0, Math.min(targetIndex, paths.length));
    if (to === from) return;
    paths.splice(to, 0, filePath);
    set(atom_workspaceLayout, {
      ...layout,
      rootContainer: updateLeaf(layout.rootContainer, paneId, { openFilePaths: paths }),
    });
  },
);

export const atom_moveTab = atom(
  null,
  (
    get,
    set,
    {
      sourcePaneId,
      targetPaneId,
      filePath,
      targetIndex,
    }: {
      sourcePaneId: string;
      targetPaneId: string;
      filePath: string;
      targetIndex: number;
    },
  ) => {
    const layout = get(atom_workspaceLayout);
    let updatedRoot = layout.rootContainer;

    if (sourcePaneId === targetPaneId) {
      const leaf = findLeaf(updatedRoot, sourcePaneId);
      if (!leaf) return;

      const paths = [...leaf.openFilePaths].filter((p) => p !== filePath);
      paths.splice(targetIndex, 0, filePath);

      updatedRoot = updateLeaf(updatedRoot, sourcePaneId, {
        openFilePaths: paths,
        activeFilePath: filePath,
      });
    } else {
      const sourceLeaf = findLeaf(updatedRoot, sourcePaneId);
      const targetLeaf = findLeaf(updatedRoot, targetPaneId);
      if (!sourceLeaf || !targetLeaf) return;

      const newSourcePaths = sourceLeaf.openFilePaths.filter(
        (p) => p !== filePath,
      );
      let newSourceActive = sourceLeaf.activeFilePath;
      if (newSourceActive === filePath) {
        newSourceActive = newSourcePaths[newSourcePaths.length - 1];
      }

      const newTargetPaths = [
        ...targetLeaf.openFilePaths.filter((p) => p !== filePath),
      ];
      newTargetPaths.splice(targetIndex, 0, filePath);

      updatedRoot = updateLeaf(updatedRoot, sourcePaneId, {
        openFilePaths: newSourcePaths,
        activeFilePath: newSourceActive,
      });
      updatedRoot = updateLeaf(updatedRoot, targetPaneId, {
        openFilePaths: newTargetPaths,
        activeFilePath: filePath,
      });
    }

    set(atom_workspaceLayout, { ...layout, rootContainer: updatedRoot });
    set(atom_activePaneId, targetPaneId);
  },
);
