import {
  WORKSPACE_LAYOUT_VERSION,
  type PaneType,
  type PanelLeaf,
  type WorkspaceContainer,
  type WorkspaceState,
} from "@/app/types/workspace";

type Node = WorkspaceContainer | PanelLeaf;

const PANE_TYPES: PaneType[] = ["editor", "preview", "metrics"];

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

// Layouts saved before versioning used "preview" for the removed app-wide
// mode; those leaves become editors (once, gated by the missing version).
export function normalizeLegacyPaneTypes(node: unknown): unknown {
  if (!isRecord(node)) return node;
  if (Array.isArray(node.children)) {
    return { ...node, children: node.children.map(normalizeLegacyPaneTypes) };
  }
  return node.type === "preview" ? { ...node, type: "editor" } : node;
}

function normalizeSizes(sizes: unknown, count: number): number[] {
  const equal = Array.from({ length: count }, () => 100 / count);
  if (!Array.isArray(sizes) || sizes.length !== count) return equal;
  if (!sizes.every((s) => typeof s === "number" && Number.isFinite(s) && s >= 0)) return equal;
  const list = sizes as number[];
  const sum = list.reduce((a, b) => a + b, 0);
  if (sum <= 0) return equal;
  if (Math.abs(sum - 100) < 1e-6) return list;
  return list.map((s) => (s / sum) * 100);
}

function normalizeNode(raw: unknown): Node | null {
  if (!isRecord(raw)) return null;
  if (Array.isArray(raw.children)) {
    const children = raw.children.map(normalizeNode).filter((c): c is Node => c !== null);
    if (children.length === 0) return null;
    if (children.length === 1) return children[0];
    const { scrollLock, ...rest } = raw;
    return {
      ...(rest as unknown as WorkspaceContainer),
      id: typeof raw.id === "string" ? raw.id : `c-${children[0].id}`,
      direction: raw.direction === "vertical" ? "vertical" : "horizontal",
      sizes: normalizeSizes(raw.sizes, children.length),
      children,
      ...(typeof scrollLock === "boolean" ? { scrollLock } : {}),
    };
  }
  if (typeof raw.id !== "string") return null;
  return {
    ...(raw as unknown as PanelLeaf),
    type: PANE_TYPES.includes(raw.type as PaneType) ? (raw.type as PaneType) : "editor",
    openFilePaths: Array.isArray(raw.openFilePaths) ? (raw.openFilePaths as string[]) : [],
    isPinned: typeof raw.isPinned === "boolean" ? raw.isPinned : false,
  };
}

export function normalizeWorkspaceLayout(raw: unknown): WorkspaceState | null {
  if (!isRecord(raw)) return null;
  const root =
    raw.version === undefined ? normalizeLegacyPaneTypes(raw.rootContainer) : raw.rootContainer;
  const rootContainer = normalizeNode(root);
  if (!rootContainer) return null;
  return { ...raw, version: WORKSPACE_LAYOUT_VERSION, rootContainer } as WorkspaceState;
}
