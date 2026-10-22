import { atom } from "jotai";
import { atom_workspaceLayout } from "./workspace-atoms";
import { findLeaf, updateLeaf, getWorkspaceTabs } from "./utils";
import { atom_openFiles } from "./file-atoms";
import { forgetClosedFiles } from "./tab-limit";

export const atom_workspaceTabs = atom((get) =>
  getWorkspaceTabs(get(atom_workspaceLayout).rootContainer),
);

export const atom_activateWorkspaceTab = atom(
  null,
  (get, set, index: number) => {
    if (index < 0 || index >= 9) return;

    const layout = get(atom_workspaceLayout);
    const tab = getWorkspaceTabs(layout.rootContainer)[index];
    if (!tab) return;

    set(atom_workspaceLayout, {
      ...layout,
      rootContainer: updateLeaf(layout.rootContainer, tab.paneId, {
        activeFilePath: tab.filePath,
      }),
    });
  },
);

export const atom_closeTab = atom(
  null,
  (get, set, { paneId, filePath }: { paneId: string; filePath: string }) => {
    const layout = get(atom_workspaceLayout);
    const leaf = findLeaf(layout.rootContainer, paneId);
    if (!leaf) return;

    const newOpenFilePaths = leaf.openFilePaths.filter((p) => p !== filePath);
    let newActiveFilePath = leaf.activeFilePath;

    if (newActiveFilePath === filePath) {
      newActiveFilePath =
        newOpenFilePaths[newOpenFilePaths.length - 1] || undefined;
    }

    const rootContainer = updateLeaf(layout.rootContainer, paneId, {
      openFilePaths: newOpenFilePaths,
      activeFilePath: newActiveFilePath,
    });
    set(atom_workspaceLayout, { ...layout, rootContainer });
    // A closed note drops its cached text, unless it has
    // unsaved changes (closing with autosave on saves those first).
    set(atom_openFiles, (prev) => forgetClosedFiles(prev, rootContainer, [filePath]));
  },
);

// Moves an open note to `targetIndex` among its pane's notes (dragged in the
// sidebar's Open Notes), which renumbers the Ctrl/Cmd+1–9 shortcuts. The note
// in front stays in front.
export const atom_reorderOpenNote = atom(
  null,
  (get, set, { paneId, filePath, targetIndex }: { paneId: string; filePath: string; targetIndex: number }) => {
    const layout = get(atom_workspaceLayout);
    const leaf = findLeaf(layout.rootContainer, paneId);
    const from = leaf?.openFilePaths.indexOf(filePath) ?? -1;
    if (!leaf || from < 0) return;
    const paths = leaf.openFilePaths.filter((p) => p !== filePath);
    const to = Math.max(0, Math.min(targetIndex, paths.length));
    if (to === from) return;
    paths.splice(to, 0, filePath);
    set(atom_workspaceLayout, {
      ...layout,
      rootContainer: updateLeaf(layout.rootContainer, paneId, { openFilePaths: paths }),
    });
  },
);
