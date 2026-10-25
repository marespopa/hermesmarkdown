// Pure: keeps the objects of a previous Changes result where a new scan found
// the same thing. Every scan (one per window focus) sends fresh objects from
// the worker; reusing the unchanged ones lets the page skip re-rendering
// their sections and keeps the gaps the user expanded open.
import type { ChangedFile, ChangesResult, FileDiff } from "@/app/services/git/git-changes-types";

const sameLines = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((line, i) => line === b[i]);

function sameDiff(a: FileDiff, b: FileDiff): boolean {
  if (a.kind !== "text" || b.kind !== "text") return a.kind === b.kind;
  return (
    a.changes.length === b.changes.length &&
    a.changes.every((change, i) => {
      const other = b.changes[i];
      return change.oldStart === other.oldStart && change.newStart === other.newStart && change.newCount === other.newCount && sameLines(change.removed, other.removed);
    }) &&
    sameLines(a.lines, b.lines)
  );
}

export function sameFile(a: ChangedFile, b: ChangedFile): boolean {
  return a.path === b.path && a.status === b.status && a.added === b.added && a.removed === b.removed && sameDiff(a.diff, b.diff);
}

/** `next`, with each file equal to one in `previous` replaced by that one; `previous` itself when nothing changed. */
export function reuseUnchanged(previous: ChangesResult | null, next: ChangesResult): ChangesResult {
  if (previous?.status !== "ok" || next.status !== "ok") return next;
  const before = new Map(previous.files.map((file) => [file.path, file]));
  const files = next.files.map((file) => {
    const old = before.get(file.path);
    return old && sameFile(old, file) ? old : file;
  });
  const unchanged = previous.commit === next.commit && files.length === previous.files.length && files.every((file, i) => file === previous.files[i]);
  return unchanged ? previous : { ...next, files };
}
