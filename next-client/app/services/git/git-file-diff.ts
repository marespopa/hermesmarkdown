// Line diff of one file for the Changes page, as DiffChange records, and the
// rules for which bytes get a diff at all.
import { Chunk } from "@codemirror/merge";
import { Text } from "@codemirror/state";
import type { DiffChange, TextFileDiff } from "./git-changes-types";
import { lineChanges } from "./git-line-diff";

export { classifyBytes, MAX_DIFF_BYTES } from "./git-classify";

/** Lines of a text; the empty text has none. */
export function splitLines(text: string): string[] {
  return text === "" ? [] : text.split(/\r?\n/);
}

/** The diff from `oldText` (null: no such file) to `newText` (null: deleted). */
export function buildFileDiff(oldText: string | null, newText: string | null): TextFileDiff {
  const oldLines = oldText === null ? [] : splitLines(oldText);
  const lines = newText === null ? [] : splitLines(newText);
  if (oldText === null) {
    return { kind: "text", lines, changes: lines.length ? [{ oldStart: 0, removed: [], newStart: 1, newCount: lines.length }] : [] };
  }
  if (newText === null) {
    return { kind: "text", lines, changes: oldLines.length ? [{ oldStart: 1, removed: oldLines, newStart: 1, newCount: 0 }] : [] };
  }
  const changes: DiffChange[] = [];
  if (oldLines.length === 0 && lines.length === 0) return { kind: "text", lines, changes };
  // One side empty: everything added or removed. (Text.of([""]) would be a
  // one-empty-line document, reported as a changed line.)
  if (oldLines.length === 0) return { kind: "text", lines, changes: [{ oldStart: 0, removed: [], newStart: 1, newCount: lines.length }] };
  if (lines.length === 0) return { kind: "text", lines, changes: [{ oldStart: 1, removed: oldLines, newStart: 1, newCount: 0 }] };
  const base = Text.of(oldLines);
  const doc = Text.of(lines);
  for (const { firstA, lastA, firstB, lastB } of lineChanges(base, doc, Chunk.build(base, doc))) {
    changes.push({ oldStart: firstA, removed: oldLines.slice(firstA - 1, lastA), newStart: firstB, newCount: lastB - firstB + 1 });
  }
  return { kind: "text", lines, changes };
}
