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
