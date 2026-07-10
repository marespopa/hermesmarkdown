import { WorkspaceContainer, PanelLeaf } from "@/app/types/workspace";

export function findLeaf(
  node: WorkspaceContainer | PanelLeaf,
  id: string | null,
): PanelLeaf | null {
  if (!id) return null;
  if ("type" in node) {
    return node.id === id ? node : null;
  }
  for (const child of node.children) {
    const found = findLeaf(child, id);
    if (found) return found;
  }
  return null;
}

export function getFirstLeaf(node: WorkspaceContainer | PanelLeaf): PanelLeaf {
  if ("type" in node) return node;
  return getFirstLeaf(node.children[0]);
}

// Drops any open tabs matching `shouldRemove` from every pane in the tree,
// falling back to a draft tab if a pane would otherwise end up empty.
// Shared by file deletion and by vault-reopen handle rebinding, since both
// need to react the same way to a tab pointing at a file that's gone.
export function removePathsFromLayout(
  node: WorkspaceContainer | PanelLeaf,
  shouldRemove: (path: string) => boolean,
): WorkspaceContainer | PanelLeaf {
  if ("type" in node) {
    const newPaths = node.openFilePaths.filter((p) => !shouldRemove(p));

    let newActive = node.activeFilePath;
    if (newPaths.length === 0) {
      newPaths.push("draft");
      newActive = "draft";
    } else if (!newActive || !newPaths.includes(newActive)) {
      newActive = newPaths[newPaths.length - 1];
    }

    return { ...node, openFilePaths: newPaths, activeFilePath: newActive };
  }
  return {
    ...node,
    children: node.children.map((child) => removePathsFromLayout(child, shouldRemove)),
  } as WorkspaceContainer;
}

export function updateLeaf(
  node: WorkspaceContainer | PanelLeaf,
  id: string,
  updates: Partial<PanelLeaf>,
): WorkspaceContainer | PanelLeaf {
  if ("type" in node) {
    if (node.id === id) {
      return { ...node, ...updates } as PanelLeaf;
    }
    return node;
  }
  return {
    ...node,
    children: node.children.map((child) => updateLeaf(child, id, updates)),
  } as WorkspaceContainer;
}

export const generateId = () => Math.random().toString(36).substring(2, 9);
