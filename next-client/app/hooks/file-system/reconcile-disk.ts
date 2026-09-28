import type { FileState } from "@/app/atoms/file-atoms";

// Merge what's on disk into a tab's cached state. Decisions are made on
// content, not timestamps — persisted tabs may have no (or a stale)
// lastModified. Returns `state` unchanged when there's nothing to update.
export function reconcileWithDisk(
  state: FileState,
  diskContent: string,
  diskModified: number,
  snapshotOnConflict: boolean,
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

  // Both sides changed — surface a conflict
  if (state.conflict?.remoteContent === diskContent) return state;

  if (snapshotOnConflict) {
    const ts = Date.now();
    return {
      ...state,
      conflict: { remoteContent: diskContent },
      lastModified: diskModified,
      snapshots: [
        ...(state.snapshots ?? []),
        { timestamp: ts, type: "remote", content: diskContent },
        { timestamp: ts, type: "local", content: state.content },
      ],
    };
  }

  return {
    ...state,
    conflict: { remoteContent: diskContent },
    lastModified: diskModified,
  };
}
