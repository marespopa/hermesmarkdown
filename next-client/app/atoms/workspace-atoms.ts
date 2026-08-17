import { atomWithStorage } from "jotai/utils";
import { atom } from "jotai";
import { WorkspaceState } from "@/app/types/workspace";

function normalizeLegacyPaneTypes(node: unknown): unknown {
  if (!node || typeof node !== "object" || Array.isArray(node)) return node;

  const record = node as Record<string, unknown>;
  if (Array.isArray(record.children)) {
    return { ...record, children: record.children.map(normalizeLegacyPaneTypes) };
  }

  return record.type === "preview" ? { ...record, type: "editor" } : record;
}

export function migrateLegacyWorkspaceLayout() {
  if (typeof window === "undefined") return;

  try {
    const stored = window.localStorage.getItem("workspaceLayout");
    if (!stored) return;

    const layout = JSON.parse(stored) as WorkspaceState;
    const rootContainer = normalizeLegacyPaneTypes(layout.rootContainer) as WorkspaceState["rootContainer"];
    if (JSON.stringify(rootContainer) !== JSON.stringify(layout.rootContainer)) {
      window.localStorage.setItem("workspaceLayout", JSON.stringify({ ...layout, rootContainer }));
    }
  } catch {
    // Invalid persisted data is handled by atomWithStorage's default fallback.
  }
}

migrateLegacyWorkspaceLayout();

// Workspace Layout
export const atom_workspaceLayout = atomWithStorage<WorkspaceState>(
  "workspaceLayout",
  {
    rootContainer: {
      id: "default-pane",
      type: "editor",
      openFilePaths: ["draft"],
      activeFilePath: "draft",
      isPinned: false,
    },
  },
);

export const atom_activePaneId = atom<string | null>("default-pane");
