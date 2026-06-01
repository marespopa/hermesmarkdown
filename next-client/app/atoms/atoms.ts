import { createStore, atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { atomFamily } from "jotai-family";
import { WorkspaceState, WorkspaceContainer, PanelLeaf } from "@/app/types/workspace";

export const contentStore = createStore();

// Theme & appearance
export const atom_theme = atomWithStorage<"light" | "dark">("theme", "light");
export const atom_wordWrap = atomWithStorage<boolean>("wordWrap", true);
export const atom_fontFamily = atomWithStorage<string>(
  "editorFontFamily",
  "var(--font-jetbrains), monospace",
);
export const atom_fontSize = atomWithStorage<string>(
  "editorFontSize",
  "prose-base",
);
export const atom_showStats = atomWithStorage<boolean>("showStats", false);
export const atom_isZenModeActive = atomWithStorage<boolean>("isZenModeActive", false);
export const atom_cursorPosition = atom<{ line: number; col: number }>({ line: 1, col: 1 });
export const atom_statusMetricMode = atomWithStorage<"words" | "chars" | "readingTime">("statusMetricMode", "words");
export const atom_isAutoSaveEnabled = atomWithStorage<boolean>("isAutoSaveEnabled", true);
export const atom_hasCompletedOnboarding = atomWithStorage<boolean>("hasCompletedOnboarding", false);
export const atom_isWizardOpen = atom<boolean>(false);

// Workspace Layout
export const atom_workspaceLayout = atomWithStorage<WorkspaceState>("workspaceLayout", {
  rootContainer: {
    id: "default-pane",
    type: "editor",
    openFilePaths: ["draft"],
    activeFilePath: "draft",
    isPinned: false
  }
});

export const atom_activePaneId = atom<string | null>("default-pane");

function findLeaf(node: WorkspaceContainer | PanelLeaf, id: string | null): PanelLeaf | null {
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

function updateLeaf(node: WorkspaceContainer | PanelLeaf, id: string, updates: Partial<PanelLeaf>): WorkspaceContainer | PanelLeaf {
  if ("type" in node) {
    if (node.id === id) {
      return { ...node, ...updates } as PanelLeaf;
    }
    return node;
  }
  return {
    ...node,
    children: node.children.map(child => updateLeaf(child, id, updates))
  } as WorkspaceContainer;
}

// File contents & metadata
export interface FileState {
  content: string;
  lastSavedContent: string;
  fileName: string;
  activeFilePath: string | null;
  lastModified?: number;
  conflict?: { remoteContent: string };
}

export const atom_openFiles = atomWithStorage<Record<string, FileState>>("openFiles", {
  draft: {
    content: "",
    lastSavedContent: "",
    fileName: "untitled",
    activeFilePath: null,
  }
});

// Non-persisted file handles (indexed by path)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const atom_liveHandles = atomFamily((_path: string) => atom<FileSystemFileHandle | null>(null));

export const atom_fileContent = atomFamily((path: string) => atom(
  (get) => get(atom_openFiles)[path]?.content || "",
  (get, set, newContent: string) => {
    const prev = get(atom_openFiles);
    const fileState = prev[path] || { 
      content: "", 
      lastSavedContent: "", 
      fileName: path.split("/").pop() || "untitled", 
      activeFilePath: path
    };
    set(atom_openFiles, {
      ...prev,
      [path]: { ...fileState, content: newContent }
    });
  }
));

// Derived atoms for the "Active" file (focused pane)
export const atom_activeFile = atom(
  (get) => {
    const layout = get(atom_workspaceLayout);
    const activePaneId = get(atom_activePaneId);
    const leaf = findLeaf(layout.rootContainer, activePaneId);
    const path = leaf?.activeFilePath || "draft";
    return get(atom_openFiles)[path];
  }
);

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
      activeFilePath: null
    };
    set(atom_openFiles, {
      ...prev,
      [path]: { ...fileState, content: newValue }
    });
  }
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
        [path]: { ...prev[path], fileName: newValue }
      });
    }
  }
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
        activeFilePath: newValue || undefined 
      };

      if (newValue && !leaf.openFilePaths.includes(newValue)) {
        updates.openFilePaths = [...leaf.openFilePaths, newValue];
      }

      set(atom_workspaceLayout, {
        ...layout,
        rootContainer: updateLeaf(layout.rootContainer, activePaneId, updates)
      });
    }
  }
);

// --- Layout Management Atoms ---

const generateId = () => Math.random().toString(36).substring(2, 9);

export const atom_splitPane = atom(
  null,
  (get, set, { id, direction }: { id: string; direction: "horizontal" | "vertical" }) => {
    const layout = get(atom_workspaceLayout);
    const leaf = findLeaf(layout.rootContainer, id);
    if (!leaf) return;

    const newLeafId = generateId();
    const newLeaf: PanelLeaf = {
      ...leaf,
      id: newLeafId,
      openFilePaths: [...leaf.openFilePaths],
    };

    const splitNode = (node: WorkspaceContainer | PanelLeaf): WorkspaceContainer | PanelLeaf => {
      if ("type" in node) {
        if (node.id === id) {
          return {
            id: generateId(),
            direction,
            sizes: [50, 50],
            children: [node, newLeaf]
          } as WorkspaceContainer;
        }
        return node;
      }
      return {
        ...node,
        children: node.children.map(child => splitNode(child))
      } as WorkspaceContainer;
    };

    set(atom_workspaceLayout, {
      ...layout,
      rootContainer: splitNode(layout.rootContainer)
    });
    set(atom_activePaneId, newLeafId);
  }
);

export const atom_closePane = atom(
  null,
  (get, set, id: string) => {
    const layout = get(atom_workspaceLayout);
    
    // Don't close the last pane
    if ("type" in layout.rootContainer) return;

    const removeNode = (node: WorkspaceContainer | PanelLeaf): WorkspaceContainer | PanelLeaf | null => {
      if ("type" in node) {
        return node.id === id ? null : node;
      }

      const newChildren = node.children
        .map(child => removeNode(child))
        .filter((child): child is (WorkspaceContainer | PanelLeaf) => child !== null);

      if (newChildren.length === 0) return null;
      if (newChildren.length === 1) return newChildren[0];

      return {
        ...node,
        children: newChildren,
        sizes: newChildren.map(() => 100 / newChildren.length)
      } as WorkspaceContainer;
    };

    const newRoot = removeNode(layout.rootContainer);
    if (newRoot) {
      set(atom_workspaceLayout, { ...layout, rootContainer: newRoot });
      // Reset active pane to something that exists
      const firstLeaf = (node: WorkspaceContainer | PanelLeaf): string => {
        if ("type" in node) return node.id;
        return firstLeaf(node.children[0]);
      };
      set(atom_activePaneId, firstLeaf(newRoot));
    }
  }
);

export const atom_closeTab = atom(
  null,
  (get, set, { paneId, filePath }: { paneId: string; filePath: string }) => {
    const layout = get(atom_workspaceLayout);
    const leaf = findLeaf(layout.rootContainer, paneId);
    if (!leaf) return;

    const newOpenFilePaths = leaf.openFilePaths.filter(p => p !== filePath);
    let newActiveFilePath = leaf.activeFilePath;

    if (newActiveFilePath === filePath) {
      newActiveFilePath = newOpenFilePaths[newOpenFilePaths.length - 1] || undefined;
    }

    set(atom_workspaceLayout, {
      ...layout,
      rootContainer: updateLeaf(layout.rootContainer, paneId, {
        openFilePaths: newOpenFilePaths,
        activeFilePath: newActiveFilePath
      })
    });
  }
);

export const atom_moveTab = atom(
  null,
  (get, set, { sourcePaneId, targetPaneId, filePath, targetIndex }: { sourcePaneId: string; targetPaneId: string; filePath: string; targetIndex: number }) => {
    const layout = get(atom_workspaceLayout);
    let updatedRoot = layout.rootContainer;

    if (sourcePaneId === targetPaneId) {
      const leaf = findLeaf(updatedRoot, sourcePaneId);
      if (!leaf) return;
      
      const paths = [...leaf.openFilePaths].filter(p => p !== filePath);
      paths.splice(targetIndex, 0, filePath);
      
      updatedRoot = updateLeaf(updatedRoot, sourcePaneId, {
        openFilePaths: paths,
        activeFilePath: filePath
      });
    } else {
      const sourceLeaf = findLeaf(updatedRoot, sourcePaneId);
      const targetLeaf = findLeaf(updatedRoot, targetPaneId);
      if (!sourceLeaf || !targetLeaf) return;

      const newSourcePaths = sourceLeaf.openFilePaths.filter(p => p !== filePath);
      let newSourceActive = sourceLeaf.activeFilePath;
      if (newSourceActive === filePath) {
        newSourceActive = newSourcePaths[newSourcePaths.length - 1];
      }

      const newTargetPaths = [...targetLeaf.openFilePaths.filter(p => p !== filePath)];
      newTargetPaths.splice(targetIndex, 0, filePath);

      updatedRoot = updateLeaf(updatedRoot, sourcePaneId, {
        openFilePaths: newSourcePaths,
        activeFilePath: newSourceActive
      });
      updatedRoot = updateLeaf(updatedRoot, targetPaneId, {
        openFilePaths: newTargetPaths,
        activeFilePath: filePath
      });
    }

    set(atom_workspaceLayout, { ...layout, rootContainer: updatedRoot });
    set(atom_activePaneId, targetPaneId);
  }
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
  }
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
        [path]: { ...prev[path], lastSavedContent: newValue }
      });
    }
  }
);

// Vault / Local File System
export const atom_vaultHandle = atom<FileSystemDirectoryHandle | null>(null);
export const atom_currentDirectoryHandle =
  atom<FileSystemDirectoryHandle | null>(null);

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
        [path]: { ...prev[path], lastModified: newValue || undefined }
      });
    }
  }
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
        [path]: { ...prev[path], conflict: newValue || undefined }
      });
    }
  }
);

export const atom_vaultFiles = atom<FileSystemHandle[]>([]);
export const atom_isVaultPending = atom<boolean>(false);
export const atom_hasLoadedVault = atom<boolean>(false);

export type SaveStatus = {
  state: "idle" | "saving" | "saved" | "error";
  retryCount: number;
  message?: string;
};
export const atom_saveStatus = atom<SaveStatus>({ state: "idle", retryCount: 0 });

export type DialogType = "alert" | "confirm" | "prompt";

export interface DialogConfig {
  type: DialogType;
  title?: string;
  message: string;
  subtext?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  defaultValue?: string;
  resolve: (value: any) => void;
}

export const atom_globalDialog = atom<DialogConfig | null>(null);

export const atom_pendingFileSwitch = atom<{
  handle: FileSystemFileHandle;
  path?: string;
} | null>(null);

export const atom_sidebarWidth = atomWithStorage<number>("sidebarWidth", 260);

