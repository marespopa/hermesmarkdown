import type { FileState } from "@/app/atoms/file-atoms";

// A note's entry after an open read it from disk: saved content on disk
// always wins. Unsaved text the browser held for it that differs from the
// disk text (`browserOnlyEdit`) is kept as a "local" snapshot on the note,
// recoverable, never prompted.
export function openedFromDisk(
  previous: FileState | undefined,
  path: string,
  fileName: string,
  diskText: string,
  diskModified: number,
  browserOnlyEdit: string | null,
): FileState {
  const keepLocal = browserOnlyEdit !== null && browserOnlyEdit !== diskText;
  const snapshots = keepLocal
    ? [...(previous?.snapshots ?? []), { timestamp: Date.now(), type: "local" as const, content: browserOnlyEdit }]
    : previous?.snapshots;
  return {
    content: diskText,
    lastSavedContent: diskText,
    fileName,
    activeFilePath: path,
    lastModified: diskModified,
    ...(snapshots ? { snapshots } : {}),
  };
}

/** The note's unsaved browser text, if it has any (not blank). */
export function browserOnlyEditOf(state: FileState | undefined): string | null {
  return state && state.content !== state.lastSavedContent && state.content.trim() ? state.content : null;
}
