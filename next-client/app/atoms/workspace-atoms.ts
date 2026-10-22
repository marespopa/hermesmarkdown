import { atomWithStorage } from "jotai/utils";
import { atom } from "jotai";
import { WORKSPACE_LAYOUT_VERSION, WorkspaceState } from "@/app/types/workspace";
import { normalizeWorkspaceLayout } from "./layout-normalize";

export function migrateLegacyWorkspaceLayout() {
  if (typeof window === "undefined") return;

  try {
    const stored = window.localStorage.getItem("workspaceLayout");
    if (!stored) return;

    const raw = JSON.parse(stored) as unknown;
    const layout = normalizeWorkspaceLayout(raw);
    if (!layout) {
      // Nothing usable: let the atom default apply.
      window.localStorage.removeItem("workspaceLayout");
      return;
    }
    if (JSON.stringify(layout) !== JSON.stringify(raw)) {
      window.localStorage.setItem("workspaceLayout", JSON.stringify(layout));
    }
  } catch {
    // Invalid persisted data is handled by atomWithStorage's default fallback.
  }
}

migrateLegacyWorkspaceLayout();

// Workspace Layout. The key is a legacy name kept so existing layouts load.
export const atom_workspaceLayout = atomWithStorage<WorkspaceState>(
  "workspaceLayout",
  {
    version: WORKSPACE_LAYOUT_VERSION,
    rootContainer: {
      id: "default-pane",
      openFilePaths: ["draft"],
      activeFilePath: "draft",
      isPinned: false,
    },
  },
);

// The editor has one pane, so the active pane is always it. Writable so
// callers that focus "their" pane keep working; the write is a no-op.
export const atom_activePaneId = atom(
  (get): string | null => get(atom_workspaceLayout).rootContainer.id,
  (_get, _set, _paneId: string | null) => {},
);
