import { atom } from "jotai";
import { atom_workspaceLayout, atom_activePaneId } from "./workspace-atoms";
import { findLeaf, updateLeaf, generateId } from "./utils";
import { WorkspaceContainer, PanelLeaf } from "@/app/types/workspace";

export const atom_splitPane = atom(
  null,
  (
    get,
    set,
    { id, direction }: { id: string; direction: "horizontal" | "vertical" },
  ) => {
    const layout = get(atom_workspaceLayout);
    const leaf = findLeaf(layout.rootContainer, id);
    if (!leaf) return;

    const newLeafId = generateId();
    const newLeaf: PanelLeaf = {
      ...leaf,
      id: newLeafId,
      openFilePaths: [...leaf.openFilePaths],
    };

    const splitNode = (
      node: WorkspaceContainer | PanelLeaf,
    ): WorkspaceContainer | PanelLeaf => {
      if ("type" in node) {
        if (node.id === id) {
          return {
            id: generateId(),
            direction,
            sizes: [50, 50],
            children: [node, newLeaf],
          } as WorkspaceContainer;
        }
        return node;
      }
      return {
        ...node,
        children: node.children.map((child) => splitNode(child)),
      } as WorkspaceContainer;
    };

    set(atom_workspaceLayout, {
      ...layout,
      rootContainer: splitNode(layout.rootContainer),
    });
    set(atom_activePaneId, newLeafId);
  },
);

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

    set(atom_workspaceLayout, {
      ...layout,
      rootContainer: updateLeaf(layout.rootContainer, paneId, {
        openFilePaths: newOpenFilePaths,
        activeFilePath: newActiveFilePath,
      }),
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
