import type { PanelLeaf, WorkspaceContainer } from "@/app/types/workspace";
import type { FileState } from "./file-atoms";
import { getWorkspaceTabs } from "./utils";

// Each pane keeps at most this many notes open. Opening one more closes the
// pane's least recently viewed note — never one with unsaved changes, the
// draft, or the note being opened — so tabs (and the cached note text kept
// for them in localStorage) can't pile up without bound. If every other tab
// has unsaved changes the pane goes over the limit rather than lose an edit.
export const MAX_TABS_PER_PANE = 20;

export function hasUnsavedChanges(state: FileState | undefined): boolean {
  return !!state && state.content !== state.lastSavedContent;
}

// `recent` with `path` moved to the end (most recent last), keeping only
// paths still open in the pane.
export function touchRecent(recent: string[] | undefined, path: string, openPaths: string[]): string[] {
  return [...(recent ?? []).filter((p) => p !== path && openPaths.includes(p)), path];
}

// Tabs to close in a pane showing `openPaths` before `incoming` is added.
// Least recently viewed first; a tab never viewed since the list started
// counts as oldest, and ties go to the leftmost tab.
export function tabsToEvict(
  openPaths: string[],
  recent: string[] | undefined,
  incoming: string,
  openFiles: Record<string, FileState>,
  max = MAX_TABS_PER_PANE,
): string[] {
  const excess = openPaths.length + 1 - max;
  if (excess <= 0) return [];
  const rank = (path: string) => (recent ?? []).indexOf(path);
  return openPaths
    .map((path, index) => ({ path, index }))
    .filter(({ path }) => path !== incoming && path !== "draft" && !hasUnsavedChanges(openFiles[path]))
    .sort((a, b) => rank(a.path) - rank(b.path) || a.index - b.index)
    .slice(0, excess)
    .map(({ path }) => path);
}

// Drops the cached state of `closed` notes that no pane shows any more,
// unless they hold unsaved changes (those stay, so reopening restores them).
export function forgetClosedFiles(
  openFiles: Record<string, FileState>,
  root: WorkspaceContainer | PanelLeaf,
  closed: string[],
): Record<string, FileState> {
  const stillOpen = new Set(getWorkspaceTabs(root).map((tab) => tab.filePath));
  const forget = closed.filter((path) =>
    path !== "draft" && path in openFiles && !stillOpen.has(path) && !hasUnsavedChanges(openFiles[path]));
  if (forget.length === 0) return openFiles;
  const next = { ...openFiles };
  for (const path of forget) delete next[path];
  return next;
}
