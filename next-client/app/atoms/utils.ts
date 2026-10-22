import { PanelLeaf } from "@/app/types/workspace";

export interface WorkspaceTab {
  paneId: string;
  filePath: string;
}

export function getWorkspaceTabs(leaf: PanelLeaf): WorkspaceTab[] {
  return leaf.openFilePaths.map((filePath) => ({ paneId: leaf.id, filePath }));
}

// Whether the pane has `path` as a tab.
export function isPathInLayout(leaf: PanelLeaf, path: string): boolean {
  return leaf.openFilePaths.includes(path);
}

export function findLeaf(leaf: PanelLeaf, id: string | null): PanelLeaf | null {
  return id && leaf.id === id ? leaf : null;
}

// Drops any open tabs matching `shouldRemove`, falling back to a draft tab if
// the pane would otherwise end up empty. Shared by file deletion and by
// vault-reopen handle rebinding, since both need to react the same way to a
// tab pointing at a file that's gone.
export function removePathsFromLayout(leaf: PanelLeaf, shouldRemove: (path: string) => boolean): PanelLeaf {
  const newPaths = leaf.openFilePaths.filter((p) => !shouldRemove(p));

  let newActive = leaf.activeFilePath;
  if (newPaths.length === 0) {
    newPaths.push("draft");
    newActive = "draft";
  } else if (!newActive || !newPaths.includes(newActive)) {
    newActive = newPaths[newPaths.length - 1];
  }

  return { ...leaf, openFilePaths: newPaths, activeFilePath: newActive };
}

// Rewrites `path` when it is `oldPrefix` itself or lives under it (a folder
// rename/move), returning null for unrelated paths. `a/b` never matches
// `a/bc`: only exact matches or a `/` boundary count.
export function remapPath(path: string, oldPrefix: string, newPrefix: string): string | null {
  if (path === oldPrefix) return newPrefix;
  if (path.startsWith(`${oldPrefix}/`)) return newPrefix + path.slice(oldPrefix.length);
  return null;
}

// Renames tab paths after a file or folder moved on disk, keeping tab order
// and the active tab.
export function remapPathsInLayout(leaf: PanelLeaf, mapPath: (path: string) => string): PanelLeaf {
  return {
    ...leaf,
    // The pane could already hold a tab at the destination path; keep one.
    openFilePaths: [...new Set(leaf.openFilePaths.map(mapPath))],
    activeFilePath: leaf.activeFilePath ? mapPath(leaf.activeFilePath) : leaf.activeFilePath,
    ...(leaf.recentFilePaths ? { recentFilePaths: [...new Set(leaf.recentFilePaths.map(mapPath))] } : {}),
  };
}

export function updateLeaf(leaf: PanelLeaf, id: string, updates: Partial<PanelLeaf>): PanelLeaf {
  return leaf.id === id ? { ...leaf, ...updates } : leaf;
}

export const generateId = () => Math.random().toString(36).substring(2, 9);
