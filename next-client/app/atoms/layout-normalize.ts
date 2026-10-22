import { WORKSPACE_LAYOUT_VERSION, type PanelLeaf, type WorkspaceState } from "@/app/types/workspace";

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((p): p is string => typeof p === "string") : [];
}

// Leaves in reading order. Layouts saved before version 3 could hold a tree
// of split panes ({ children: [...] }); every leaf in it is kept.
function collectLeaves(node: unknown): Record<string, unknown>[] {
  if (!isRecord(node)) return [];
  if (Array.isArray(node.children)) return node.children.flatMap(collectLeaves);
  return typeof node.id === "string" ? [node] : [];
}

// The workspace has one pane. A legacy split layout merges into its first
// pane: every pane's notes, in order and without duplicates, with the first
// pane's front note still in front. Pane types (editor, preview, metrics) and
// split sizes are gone.
export function normalizeWorkspaceLayout(raw: unknown): WorkspaceState | null {
  if (!isRecord(raw)) return null;
  const leaves = collectLeaves(raw.rootContainer);
  if (leaves.length === 0) return null;
  const [first] = leaves;
  const openFilePaths = [...new Set(leaves.flatMap((leaf) => strings(leaf.openFilePaths)))];
  const recent = leaves.flatMap((leaf) => strings(leaf.recentFilePaths));
  const active = leaves
    .map((leaf) => leaf.activeFilePath)
    .find((p): p is string => typeof p === "string" && openFilePaths.includes(p));
  const rootContainer: PanelLeaf = {
    id: first.id as string,
    openFilePaths,
    ...(active ? { activeFilePath: active } : {}),
    ...(recent.length > 0 ? { recentFilePaths: [...new Set(recent.reverse())].reverse() } : {}),
    isPinned: typeof first.isPinned === "boolean" ? first.isPinned : false,
  };
  return { ...raw, version: WORKSPACE_LAYOUT_VERSION, rootContainer };
}
