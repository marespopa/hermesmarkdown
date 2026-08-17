import { atomWithStorage } from "jotai/utils";
import { atom } from "jotai";
import { WorkspaceState } from "@/app/types/workspace";

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
