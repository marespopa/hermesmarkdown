import type { DockZone, PanelLeaf, WorkspaceContainer } from "@/app/types/workspace";
import { generateId } from "./utils";

type Node = WorkspaceContainer | PanelLeaf;

export function findParent(root: Node, childId: string): WorkspaceContainer | null {
  if ("type" in root) return null;
  if (root.children.some((c) => c.id === childId)) return root;
  for (const child of root.children) {
    const found = findParent(child, childId);
    if (found) return found;
  }
  return null;
}

// Removes a leaf; its parent collapses into the remaining sibling (like
// atom_closePane). Returns the removed leaf, or null when it isn't found.
export function detachLeaf(root: Node, leafId: string): { root: Node | null; leaf: PanelLeaf | null } {
  let found: PanelLeaf | null = null;
  const walk = (node: Node): Node | null => {
    if ("type" in node) {
      if (node.id === leafId) {
        found = node;
        return null;
      }
      return node;
    }
    const children = node.children.map(walk).filter((c): c is Node => c !== null);
    if (children.length === 0) return null;
    if (children.length === 1) return children[0];
    if (children.length === node.children.length) return { ...node, children };
    return { ...node, children, sizes: children.map(() => 100 / children.length) };
  };
  const next = walk(root);
  return found ? { root: next, leaf: found } : { root, leaf: null };
}

export function insertLeafAt(
  root: Node,
  targetLeafId: string,
  zone: Exclude<DockZone, "center">,
  leaf: PanelLeaf,
): Node {
  const walk = (node: Node): Node => {
    if ("type" in node) {
      if (node.id !== targetLeafId) return node;
      return {
        id: generateId(),
        direction: zone === "left" || zone === "right" ? "horizontal" : "vertical",
        sizes: [50, 50],
        children: zone === "left" || zone === "top" ? [leaf, node] : [node, leaf],
      };
    }
    const replaced = node.children.some((c) => c.id === targetLeafId);
    // The parent's side is a split now, so it no longer holds two panes.
    const { scrollLock, ...rest } = node;
    void scrollLock;
    return { ...(replaced ? rest : node), children: node.children.map(walk) };
  };
  return walk(root);
}

export function setContainer(root: Node, containerId: string, updates: Partial<WorkspaceContainer>): Node {
  if ("type" in root) return root;
  if (root.id === containerId) return { ...root, ...updates };
  return { ...root, children: root.children.map((c) => setContainer(c, containerId, updates)) };
}

// The parent split of a leaf, only when it holds exactly two leaves.
export function lockablePair(root: Node, leafId: string): WorkspaceContainer | null {
  const parent = findParent(root, leafId);
  if (!parent || parent.children.length !== 2) return null;
  return parent.children.every((c) => "type" in c) ? parent : null;
}
