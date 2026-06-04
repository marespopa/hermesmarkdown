import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { atomFamily } from "jotai-family";
import { atom_workspaceLayout, atom_activePaneId } from "./workspace-atoms";
import { findLeaf, updateLeaf } from "./utils";
import { PanelLeaf } from "../types/workspace";

// File contents & metadata
export interface FileState {
  content: string;
  lastSavedContent: string;
  fileName: string;
  activeFilePath: string | null;
  lastModified?: number;
  conflict?: { remoteContent: string };
}

export const atom_openFiles = atomWithStorage<Record<string, FileState>>(
  "openFiles",
  {
    draft: {
      content: "",
      lastSavedContent: "",
      fileName: "untitled",
      activeFilePath: null,
    },
  },
);

// Non-persisted file handles (indexed by path)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const atom_liveHandles = atomFamily((path: string) =>
  atom<FileSystemFileHandle | null>(null),
);

export const atom_fileContent = atomFamily((path: string) =>
  atom(
    (get) => get(atom_openFiles)[path]?.content || "",
    (get, set, newContent: string) => {
      const prev = get(atom_openFiles);
      const fileState = prev[path] || {
        content: "",
        lastSavedContent: "",
        fileName: (path.split("/").pop() || "untitled").replace(/\.md$/, ""),
        activeFilePath: path,
      };
      set(atom_openFiles, {
        ...prev,
        [path]: { ...fileState, content: newContent },
      });
    },
  ),
);

// Derived atoms for the "Active" file (focused pane)
export const atom_activeFile = atom((get) => {
  const layout = get(atom_workspaceLayout);
  const activePaneId = get(atom_activePaneId);
  const leaf = findLeaf(layout.rootContainer, activePaneId);
  const path = leaf?.activeFilePath || "draft";
  return get(atom_openFiles)[path];
});

export const atom_content = atom(
  (get) => get(atom_activeFile)?.content || "",
  (get, set, newValue: string) => {
    const layout = get(atom_workspaceLayout);
    const activePaneId = get(atom_activePaneId);
    const leaf = findLeaf(layout.rootContainer, activePaneId);
    const path = leaf?.activeFilePath || "draft";

    const prev = get(atom_openFiles);
    const fileState = prev[path] || {
      content: "",
      lastSavedContent: "",
      fileName: "untitled",
      activeFilePath: null,
    };
    set(atom_openFiles, {
      ...prev,
      [path]: { ...fileState, content: newValue },
    });
  },
);

export const atom_fileName = atom(
  (get) => get(atom_activeFile)?.fileName || "",
  (get, set, newValue: string) => {
    const layout = get(atom_workspaceLayout);
    const activePaneId = get(atom_activePaneId);
    const leaf = findLeaf(layout.rootContainer, activePaneId);
    const path = leaf?.activeFilePath || "draft";

    const prev = get(atom_openFiles);
    if (prev[path]) {
      set(atom_openFiles, {
        ...prev,
        [path]: { ...prev[path], fileName: newValue },
      });
    }
  },
);

export const atom_activeFilePath = atom(
  (get) => get(atom_activeFile)?.activeFilePath || null,
  (get, set, newValue: string | null) => {
    const layout = get(atom_workspaceLayout);
    const activePaneId = get(atom_activePaneId);

    if (activePaneId) {
      const leaf = findLeaf(layout.rootContainer, activePaneId);
      if (!leaf) return;

      const updates: Partial<PanelLeaf> = {
        activeFilePath: newValue || undefined,
      };

      if (newValue && !leaf.openFilePaths.includes(newValue)) {
        // If we are opening a file while currently in a "draft", replace the draft tab
        if (leaf.activeFilePath === "draft") {
          updates.openFilePaths = leaf.openFilePaths.map((p) =>
            p === "draft" ? newValue : p,
          );
        } else {
          updates.openFilePaths = [...leaf.openFilePaths, newValue];
        }
      }

      set(atom_workspaceLayout, {
        ...layout,
        rootContainer: updateLeaf(layout.rootContainer, activePaneId, updates),
      });
    }
  },
);

export const atom_activeFileHandle = atom(
  (get) => {
    const layout = get(atom_workspaceLayout);
    const activePaneId = get(atom_activePaneId);
    const leaf = findLeaf(layout.rootContainer, activePaneId);
    const path = leaf?.activeFilePath || "draft";
    return get(atom_liveHandles(path));
  },
  (get, set, newValue: FileSystemFileHandle | null) => {
    const layout = get(atom_workspaceLayout);
    const activePaneId = get(atom_activePaneId);
    const leaf = findLeaf(layout.rootContainer, activePaneId);
    const path = leaf?.activeFilePath || "draft";

    set(atom_liveHandles(path), newValue);
  },
);

export const atom_lastSavedContent = atom(
  (get) => get(atom_activeFile)?.lastSavedContent || "",
  (get, set, newValue: string) => {
    const prev = get(atom_openFiles);
    const layout = get(atom_workspaceLayout);
    const activePaneId = get(atom_activePaneId);
    const leaf = findLeaf(layout.rootContainer, activePaneId);
    const path = leaf?.activeFilePath || "draft";

    if (prev[path]) {
      set(atom_openFiles, {
        ...prev,
        [path]: { ...prev[path], lastSavedContent: newValue },
      });
    }
  },
);

export const atom_fileLastModified = atom(
  (get) => get(atom_activeFile)?.lastModified || null,
  (get, set, newValue: number | null) => {
    const layout = get(atom_workspaceLayout);
    const activePaneId = get(atom_activePaneId);
    const leaf = findLeaf(layout.rootContainer, activePaneId);
    const path = leaf?.activeFilePath || "draft";

    const prev = get(atom_openFiles);
    if (prev[path]) {
      set(atom_openFiles, {
        ...prev,
        [path]: { ...prev[path], lastModified: newValue || undefined },
      });
    }
  },
);

export const atom_fileConflict = atom(
  (get) => get(atom_activeFile)?.conflict || null,
  (get, set, newValue: { remoteContent: string } | null) => {
    const layout = get(atom_workspaceLayout);
    const activePaneId = get(atom_activePaneId);
    const leaf = findLeaf(layout.rootContainer, activePaneId);
    const path = leaf?.activeFilePath || "draft";

    const prev = get(atom_openFiles);
    if (prev[path]) {
      set(atom_openFiles, {
        ...prev,
        [path]: { ...prev[path], conflict: newValue || undefined },
      });
    }
  },
);

export type SaveStatus = {
  state: "idle" | "saving" | "saved" | "error";
  retryCount: number;
  message?: string;
  path?: string;
};

export const atom_saveStatus = atom<SaveStatus>({
  state: "idle",
  retryCount: 0,
  path: undefined,
});
