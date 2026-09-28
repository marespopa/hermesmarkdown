import type { FileState } from "@/app/atoms/file-atoms";

// Merge what's on disk into a tab's cached state. Decisions are made on
// content, not timestamps — persisted tabs may have no (or a stale)
// lastModified. Returns `state` unchanged when there's nothing to update.
// Disk is the source of truth: the only time cached text survives a
// differing disk file is when the disk still holds the last-saved version
// (plain unsaved edits, nothing changed underneath them).
export function reconcileWithDisk(
  state: FileState,
  diskContent: string,
  diskModified: number,
): FileState {
  const isDirty = state.content !== state.lastSavedContent;

  // Tab already matches disk — just record that it's saved
  if (diskContent === state.content) {
    if (!isDirty && state.lastModified === diskModified && !state.conflict) return state;
    return {
      ...state,
      lastSavedContent: diskContent,
      lastModified: diskModified,
      conflict: undefined,
    };
  }

  // No local edits — take the disk version
  if (!isDirty) {
    return {
      ...state,
      content: diskContent,
      lastSavedContent: diskContent,
      lastModified: diskModified,
    };
  }

  // Local edits on top of an unchanged disk file — keep them
  if (diskContent === state.lastSavedContent) {
    if (state.lastModified === diskModified) return state;
    return { ...state, lastModified: diskModified };
  }

  // Both sides changed — saved content on disk wins. The unsaved browser
  // text is always kept as a "local" snapshot so it stays recoverable.
  return {
    ...state,
    content: diskContent,
    lastSavedContent: diskContent,
    lastModified: diskModified,
    conflict: undefined,
    snapshots: [
      ...(state.snapshots ?? []),
      { timestamp: Date.now(), type: "local", content: state.content },
    ],
  };
}
