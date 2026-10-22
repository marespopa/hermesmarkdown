import { atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { atomFamily } from "jotai-family";
import { atom_workspaceLayout, atom_activePaneId } from "./workspace-atoms";
import { findLeaf, updateLeaf } from "./utils";
import { forgetClosedFiles, tabsToEvict, touchRecent } from "./tab-limit";
import { clearRecoveryIssue, isQuotaError, reportRecoveryIssue } from "./recovery-atoms";
import { PanelLeaf } from "../types/workspace";

// File contents & metadata
export interface Snapshot {
  timestamp: number;
  type: "local" | "remote";
  content: string;
}

export interface FileState {
  content: string;
  lastSavedContent: string;
  fileName: string;
  activeFilePath: string | null;
  lastModified?: number;
  conflict?: { remoteContent: string };
  snapshots?: Snapshot[];
}

// Typing changes the open notes on every keystroke, and writing them all to
// localStorage each time (a JSON copy of every open note and its snapshots)
// cost the editor a frame per key. Writes wait for a pause in typing and go
// out at once when the page is hidden or closed; reads see the pending value.
const PERSIST_DELAY_MS = 400;

type SyncStorage<T> = ReturnType<typeof createJSONStorage<T>>;

export function debouncedJSONStorage<T>(delay = PERSIST_DELAY_MS): SyncStorage<T> {
  const storage = createJSONStorage<T>(() => localStorage);
  let pending: { key: string; value: T } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = () => {
    clearTimeout(timer);
    if (!pending) return;
    const { key, value } = pending;
    pending = null;
    // A full localStorage throws; the notes stay in memory, so say so
    // instead of losing the write silently.
    try {
      storage.setItem(key, value);
      clearRecoveryIssue("storage-full");
    } catch (err) {
      if (!isQuotaError(err)) throw err;
      reportRecoveryIssue({ kind: "storage-full" });
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
  }
  return {
    ...storage,
    getItem: (key, initialValue) => (pending?.key === key ? pending.value : storage.getItem(key, initialValue)),
    setItem: (key, value) => {
      if (pending && pending.key !== key) flush();
      pending = { key, value };
      clearTimeout(timer);
      timer = setTimeout(flush, delay);
    },
    removeItem: (key) => {
      if (pending?.key === key) pending = null;
      storage.removeItem(key);
    },
  };
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
  debouncedJSONStorage(),
);

export const atom_hasOpenFileContent = atom((get) =>
  Object.values(get(atom_openFiles)).some((file) => file.content.trim().length > 0),
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

// Derived atoms for the "Active" file (the pane's front note)
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
      let evicted: string[] = [];

      if (newValue && !leaf.openFilePaths.includes(newValue)) {
        // If we are opening a file while currently in a "draft", replace the draft tab
        if (leaf.activeFilePath === "draft") {
          updates.openFilePaths = leaf.openFilePaths.map((p) =>
            p === "draft" ? newValue : p,
          );
        } else {
          // At the pane's tab limit, the least recently viewed notes close (tab-limit.ts).
          evicted = tabsToEvict(leaf.openFilePaths, leaf.recentFilePaths, newValue, get(atom_openFiles));
          updates.openFilePaths = [...leaf.openFilePaths.filter((p) => !evicted.includes(p)), newValue];
        }
      }
      if (newValue) {
        updates.recentFilePaths = touchRecent(leaf.recentFilePaths, newValue, updates.openFilePaths ?? leaf.openFilePaths);
      }

      const rootContainer = updateLeaf(layout.rootContainer, activePaneId, updates);
      set(atom_workspaceLayout, { ...layout, rootContainer });
      if (evicted.length > 0) {
        set(atom_openFiles, (prev) => forgetClosedFiles(prev, rootContainer, evicted));
      }
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

export const EMPTY_DRAFT: FileState = {
  content: "",
  lastSavedContent: "",
  fileName: "untitled",
  activeFilePath: null,
};

// Focuses the draft tab, adding it when absent. An unsaved draft keeps its
// text; otherwise it starts blank. The pane id is accepted for callers that
// pass one; there is only one pane.
export const atom_openDraft = atom(null, (get, set, _paneId?: string) => {
  const leaf = get(atom_workspaceLayout).rootContainer;
  if (!get(atom_openFiles).draft) {
    set(atom_openFiles, (prev) => ({ ...prev, draft: { ...EMPTY_DRAFT } }));
  }
  set(atom_liveHandles("draft"), null);
  set(atom_workspaceLayout, (prev) => ({
    ...prev,
    rootContainer: updateLeaf(prev.rootContainer, leaf.id, {
      openFilePaths: leaf.openFilePaths.includes("draft") ? leaf.openFilePaths : [...leaf.openFilePaths, "draft"],
      activeFilePath: "draft",
    }),
  }));
});

// Vault path the draft was last saved to. The pane keeps its editor mounted
// across that draft → file switch, so the caret and undo history survive.
export const atom_materializedDraftPath = atom<string | null>(null);

export interface MaterializedDraft {
  paneId: string;
  path: string;
  fileName: string;
  /** What was written to disk; text typed during the write stays unsaved. */
  savedContent: string;
  lastModified?: number;
}

// Turns the draft tab into the file just written for it: the tab changes
// path in place, keeps the latest text, and the draft slot is emptied.
export const atom_materializeDraft = atom(null, (get, set, draft: MaterializedDraft) => {
  const current = get(atom_openFiles).draft ?? EMPTY_DRAFT;
  set(atom_openFiles, (prev) => ({
    ...prev,
    draft: { ...EMPTY_DRAFT },
    [draft.path]: {
      content: current.content,
      lastSavedContent: draft.savedContent,
      fileName: draft.fileName,
      activeFilePath: draft.path,
      ...(draft.lastModified !== undefined ? { lastModified: draft.lastModified } : {}),
    },
  }));
  set(atom_materializedDraftPath, draft.path);
  const leaf = get(atom_workspaceLayout).rootContainer;
  set(atom_workspaceLayout, (prev) => ({
    ...prev,
    rootContainer: updateLeaf(prev.rootContainer, leaf.id, {
      openFilePaths: leaf.openFilePaths.includes("draft")
        ? [...new Set(leaf.openFilePaths.map((p) => (p === "draft" ? draft.path : p)))]
        : [...new Set([...leaf.openFilePaths, draft.path])],
      activeFilePath: leaf.activeFilePath === "draft" || !leaf.activeFilePath ? draft.path : leaf.activeFilePath,
    }),
  }));
});

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
