import { atom, type SetStateAction } from "jotai";
import { atomFamily } from "jotai-family";
import { atom_workspaceLayout, atom_activePaneId } from "./workspace-atoms";
import { findLeaf, updateLeaf } from "./utils";
import { forgetClosedFiles, tabsToEvict, touchRecent } from "./tab-limit";
import { openNotesPersister } from "./open-notes/open-notes-persister";
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

export { debouncedJSONStorage } from "./open-notes/legacy-storage";

type OpenFiles = Record<string, FileState>;

const DEFAULT_OPEN_FILES: OpenFiles = {
  draft: {
    content: "",
    lastSavedContent: "",
    fileName: "untitled",
    activeFilePath: null,
  },
};

// The open notes and whether their stored text has arrived. Kept in
// browser storage by openNotesPersister (open-notes/): the text in
// IndexedDB, one record per note, written when the browser is idle.
const atom_openFilesState = atom<{ files: OpenFiles; hydrated: boolean }>({ files: DEFAULT_OPEN_FILES, hydrated: false });

// On first use in a store, the stored notes come in. Notes set before that
// (a test seeding the store) are kept. When only the notes' names are
// stored at once, their text follows from IndexedDB: notes changed in
// between keep their change, the others take the stored text.
atom_openFilesState.onMount = (setState) => {
  const { files, load } = openNotesPersister.start();
  let placeholders: OpenFiles | null = null;
  setState((prev) => {
    if (prev.files !== DEFAULT_OPEN_FILES || !files) return { files: prev.files, hydrated: prev.hydrated || !load };
    placeholders = files;
    return { files, hydrated: !load };
  });
  if (!load) return;
  void load.then((loaded) => {
    setState((prev) => {
      const touched: string[] = [];
      const next: OpenFiles = { ...prev.files };
      if (loaded && placeholders) {
        for (const [path, state] of Object.entries(loaded)) {
          if (prev.files[path] === placeholders[path]) next[path] = state;
          else touched.push(path);
        }
      }
      openNotesPersister.hydrated(next, touched);
      return { files: next, hydrated: true };
    });
  });
};

export const atom_openFiles = atom(
  (get) => get(atom_openFilesState).files,
  (get, set, update: SetStateAction<OpenFiles>) => {
    const prev = get(atom_openFilesState);
    const files = typeof update === "function" ? update(prev.files) : update;
    if (files === prev.files) return;
    set(atom_openFilesState, { files, hydrated: prev.hydrated });
    openNotesPersister.change(files);
  },
);

// Whether the open notes' stored text has arrived (PaneLeaf shows the
// delayed skeleton until then, not an empty note).
export const atom_openNotesHydrated = atom((get) => get(atom_openFilesState).hydrated);

/** Resolves once the open notes' stored text is in the atom; code comparing them with disk waits for it. */
export const whenOpenNotesHydrated = () => openNotesPersister.whenReady();
export const isOpenNotesHydrated = () => openNotesPersister.isReady();

export const atom_hasOpenFileContent = atom((get) =>
  Object.values(get(atom_openFiles)).some((file) => file.content.trim().length > 0),
);

// One note's name, and whether it has unsaved changes, apart from its text:
// what reads these re-renders when they change, not on every keystroke.
export const atom_openNoteFileName = atomFamily((path: string) =>
  atom((get) => get(atom_openFiles)[path]?.fileName),
);
export const atom_openNoteDirty = atomFamily((path: string) =>
  atom((get) => {
    const state = get(atom_openFiles)[path];
    return !!state && state.content !== state.lastSavedContent;
  }),
);
// Whether the draft holds any text.
export const atom_draftHasText = atom((get) => !!get(atom_openFiles).draft?.content.trim());

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
