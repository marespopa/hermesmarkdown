import { atom } from "jotai";

// What is being dragged toward a pane, while a drag from a Files tree row, an
// Open Notes row or a pane grip is in progress. Ephemeral (not persisted): a
// payload atom rather than dataTransfer data, because the Files tree drag
// sets none and dragover can't read it anyway. Every pane shows its drop
// layer (PaneDropLayer) while this is set.
export type PaneDragPayload =
  | { kind: "file"; path: string; handle: FileSystemFileHandle }
  | { kind: "open-note"; path: string; sourcePaneId: string }
  | { kind: "pane"; paneId: string };

export const atom_paneDrag = atom<PaneDragPayload | null>(null);
