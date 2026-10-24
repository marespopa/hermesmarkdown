import { atom } from "jotai";
import { atom_workspaceLayout } from "./workspace-atoms";
import { findLeaf, updateLeaf } from "./utils";
import { atom_openFiles } from "./file-atoms";
import { forgetClosedFiles } from "./tab-limit";

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
