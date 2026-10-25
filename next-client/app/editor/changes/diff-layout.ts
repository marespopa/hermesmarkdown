// Pure layout of a file's diff into unified-diff rows: each change with 3
// unchanged lines of context on both sides, longer unchanged stretches folded
// into one gap row, and the budgets that decide which sections start collapsed.
import type { ChangedFile, TextFileDiff } from "@/app/services/git/git-changes-types";

export type DiffRow =
  | { kind: "context"; oldNo: number; newNo: number; text: string }
  | { kind: "add"; newNo: number; text: string }
  | { kind: "del"; oldNo: number; openLine: number; text: string }
  | { kind: "gap"; id: number; count: number };

/** A section with more rows than this starts collapsed. */
export const MAX_SECTION_ROWS = 400;
/** Sections start expanded only while their rows add up to this. */
export const MAX_EXPANDED_ROWS = 3000;

export function layoutDiff(diff: TextFileDiff, expandedGaps: ReadonlySet<number>, context = 3): DiffRow[] {
  const { changes, lines } = diff;
  const rows: DiffRow[] = [];
  let newNo = 1;
  let delta = 0; // old number minus new number of the unchanged lines at newNo

  const unchanged = (gapId: number, end: number) => {
    const count = end - newNo + 1;
    if (count <= 0) return;
    const head = gapId > 0 ? context : 0;
    const tail = gapId < changes.length ? context : 0;
    const fold = !expandedGaps.has(gapId) && changes.length > 0 && count > (head && tail ? 2 * context : context);
    const shown = (from: number, to: number) => {
      for (let n = from; n <= to; n++) rows.push({ kind: "context", oldNo: n + delta, newNo: n, text: lines[n - 1] });
    };
    if (!fold) {
      shown(newNo, end);
    } else {
      shown(newNo, newNo + head - 1);
      rows.push({ kind: "gap", id: gapId, count: count - head - tail });
      shown(end - tail + 1, end);
    }
    newNo = end + 1;
  };

  changes.forEach((change, index) => {
    unchanged(index, change.newStart - 1);
    const openLine = Math.max(1, Math.min(change.newStart, lines.length));
    change.removed.forEach((text, k) => rows.push({ kind: "del", oldNo: change.oldStart + k, openLine, text }));
    for (let k = 0; k < change.newCount; k++) rows.push({ kind: "add", newNo: change.newStart + k, text: lines[change.newStart - 1 + k] });
    newNo = change.newStart + change.newCount;
    delta = change.oldStart + change.removed.length - newNo;
  });
  unchanged(changes.length, lines.length);
  return rows;
}

/** The new-side line a click on the path opens: the first change, or line 1. */
export function firstChangeLine(file: ChangedFile): number {
  if (file.diff.kind !== "text" || file.diff.changes.length === 0) return 1;
  return Math.max(1, Math.min(file.diff.changes[0].newStart, file.diff.lines.length));
}

/** Rows the file shows before any gap is expanded; 0 for files without a text diff. */
export function rowCount(file: ChangedFile): number {
  return file.diff.kind === "text" ? layoutDiff(file.diff, new Set()).length : 0;
}

/** Paths that start collapsed: huge sections, and everything past the expanded-rows budget. */
export function initialCollapsed(files: readonly ChangedFile[]): Set<string> {
  const collapsed = new Set<string>();
  let expanded = 0;
  for (const file of files) {
    const rows = rowCount(file);
    if (rows > MAX_SECTION_ROWS || expanded + rows > MAX_EXPANDED_ROWS) collapsed.add(file.path);
    else expanded += rows;
  }
  return collapsed;
}
