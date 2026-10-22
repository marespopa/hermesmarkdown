import { useCallback } from "react";
import { useStore } from "jotai";
import type { DockZone } from "@/app/types/workspace";
import { atom_activePaneId, atom_workspaceLayout } from "@/app/atoms/workspace-atoms";
import { atom_openFiles } from "@/app/atoms/file-atoms";
import { atom_paneDrag } from "@/app/atoms/pane-drag-atoms";
import { atom_dockNote, atom_dockPane } from "@/app/atoms/dock-actions";
import { findLeaf } from "@/app/atoms/utils";
import { hasUnsavedChanges } from "@/app/atoms/tab-limit";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useDialog } from "@/app/hooks/use-dialog";

// Runs the drop of whatever is being dragged (atom_paneDrag) on a pane's zone.
export function usePaneDrop(): (targetPaneId: string, zone: DockZone) => Promise<void> {
  const store = useStore();
  const { openFile } = useFileSystem();
  const dialog = useDialog();

  return useCallback(
    async (targetPaneId, zone) => {
      const payload = store.get(atom_paneDrag);
      store.set(atom_paneDrag, null);
      if (!payload) return;

      if (payload.kind === "open-note") {
        store.set(atom_dockNote, { path: payload.path, targetPaneId, zone, sourcePaneId: payload.sourcePaneId });
        return;
      }
      if (payload.kind === "pane") {
        store.set(atom_dockPane, { paneId: payload.paneId, targetPaneId, zone });
        return;
      }

      // A file row: opens the note (read from disk) as a click would.
      if (zone !== "center") {
        store.set(atom_dockNote, { path: payload.path, targetPaneId, zone });
        // Force: the draft isn't being replaced, the new pane is empty.
        await openFile(payload.handle, payload.path, true);
        return;
      }

      store.set(atom_activePaneId, targetPaneId);
      // The check lives here, not in openFile: its own reads the previously
      // active pane from its render closure.
      const target = findLeaf(store.get(atom_workspaceLayout).rootContainer, targetPaneId);
      const draft = store.get(atom_openFiles).draft;
      if (target?.activeFilePath === "draft" && hasUnsavedChanges(draft) && draft?.content.trim()) {
        const confirmed = await dialog.confirm(
          "You have unsaved changes in your draft. Open this file and discard them?",
          "Unsaved Changes",
          "Open File",
          "Cancel",
          "You can save your draft first to avoid losing work.",
        );
        if (!confirmed) return;
      }
      await openFile(payload.handle, payload.path, true);
    },
    [store, openFile, dialog],
  );
}
