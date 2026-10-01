import { WorkspaceContainer, PanelLeaf } from "@/app/types/workspace";

export interface WorkspaceTab {
  paneId: string;
  filePath: string;
}

export function getWorkspaceTabs(
  node: WorkspaceContainer | PanelLeaf,
): WorkspaceTab[] {
  if ("type" in node) {
    return node.openFilePaths.map((filePath) => ({ paneId: node.id, filePath }));
  }

  return node.children.flatMap(getWorkspaceTabs);
}

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

// The pane at the window's top-right corner: the last child of a side-by-side
// split, the first child of a stacked one. Window-wide toolbar actions live in
// its header so they stay put while focus moves between panes.
export function getTopTrailingLeaf(node: WorkspaceContainer | PanelLeaf): PanelLeaf {
  if ("type" in node) return node;
  const child = node.direction === "horizontal" ? node.children[node.children.length - 1] : node.children[0];
  return getTopTrailingLeaf(child);
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

// Rewrites `path` when it is `oldPrefix` itself or lives under it (a folder
// rename/move), returning null for unrelated paths. `a/b` never matches
// `a/bc`: only exact matches or a `/` boundary count.
export function remapPath(path: string, oldPrefix: string, newPrefix: string): string | null {
  if (path === oldPrefix) return newPrefix;
  if (path.startsWith(`${oldPrefix}/`)) return newPrefix + path.slice(oldPrefix.length);
  return null;
}

// Renames tab paths in every pane after a file or folder moved on disk,
// keeping tab order and each pane's active tab.
export function remapPathsInLayout(
  node: WorkspaceContainer | PanelLeaf,
  mapPath: (path: string) => string,
): WorkspaceContainer | PanelLeaf {
  if ("type" in node) {
    return {
      ...node,
      // A pane could already hold a tab at the destination path; keep one.
      openFilePaths: [...new Set(node.openFilePaths.map(mapPath))],
      activeFilePath: node.activeFilePath ? mapPath(node.activeFilePath) : node.activeFilePath,
    };
  }
  return {
    ...node,
    children: node.children.map((child) => remapPathsInLayout(child, mapPath)),
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
