import { proposalHunks } from "@/app/editor/components/companion/proposal";

// Review of a change made to a note from outside the editor (an AI tool, a
// Git pull, a synced folder). The disk text has already won; this keeps what
// the note said before, split into changes, so each can be kept or undone.
// Pure: no React, no editor.

export interface ExternalChange {
  id: string;
  /** The heading the change sits under in the new text; "" above the first. */
  heading: string;
  /** Text that was there before and is now gone. */
  removed: string;
  /** Text that is in the note now. */
  added: string;
  /** Where `added` starts in the note's current text. */
  at: number;
  /** The characters just before `at`, to find the change again after edits. */
  anchor: string;
}

export interface ExternalReview {
  path: string;
  before: string;
  after: string;
  changes: ExternalChange[];
}

// Beyond this the line comparison costs more than the review is worth.
export const MAX_REVIEW_LINES = 4000;
const ANCHOR_LENGTH = 40;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const HEADING = /^ {0,3}#{1,6}[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/;

const lineCount = (text: string) => text.split("\n").length;

// Every heading with the offset its line starts at, outside fenced code.
function headingOffsets(text: string): Array<{ at: number; title: string }> {
  const found: Array<{ at: number; title: string }> = [];
  let fence: string | null = null;
  let offset = 0;
  for (const line of text.split("\n")) {
    const fenceMatch = FENCE.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
    } else if (!fence) {
      const heading = HEADING.exec(line);
      if (heading) found.push({ at: offset, title: heading[1] });
    }
    offset += line.length + 1;
  }
  return found;
}

/** The changes between `before` and `after`; null when there is nothing to review. */
export function buildExternalReview(path: string, before: string, after: string): ExternalReview | null {
  if (before === after) return null;
  if (lineCount(before) > MAX_REVIEW_LINES || lineCount(after) > MAX_REVIEW_LINES) return null;
  const headings = headingOffsets(after);
  let shift = 0;
  const changes = proposalHunks(before, after).map((hunk): ExternalChange => {
    const at = hunk.from + shift;
    shift += hunk.insert.length - (hunk.to - hunk.from);
    const above = headings.filter((heading) => heading.at <= at).pop();
    return {
      id: hunk.id,
      heading: above?.title ?? "",
      removed: before.slice(hunk.from, hunk.to),
      added: hunk.insert,
      at,
      anchor: after.slice(Math.max(0, at - ANCHOR_LENGTH), at),
    };
  });
  return changes.length ? { path, before, after, changes } : null;
}

/**
 * The review after another outside change: when it picks up where the last
 * one left off, both are reviewed together against the text from before the
 * first.
 */
export function continueExternalReview(
  existing: ExternalReview | undefined,
  path: string,
  before: string,
  after: string,
): ExternalReview | null {
  return buildExternalReview(path, existing && existing.after === before ? existing.before : before, after);
}

/** Where the change sits in `text` now, or null when edits have moved or removed it. */
export function locateChange(text: string, change: ExternalChange): number | null {
  const wanted = change.anchor + change.added;
  const start = change.at - change.anchor.length;
  if (!wanted) return change.at <= text.length ? change.at : null;
  if (start >= 0 && text.startsWith(wanted, start)) return change.at;
  const first = text.indexOf(wanted);
  if (first < 0 || text.indexOf(wanted, first + 1) >= 0) return null;
  return first + change.anchor.length;
}

/** The edit that puts back what the change replaced. */
export function undoEdit(change: ExternalChange, at: number): { from: number; to: number; insert: string } {
  return { from: at, to: at + change.added.length, insert: change.removed };
}

/** The review without the changes in `ids`; `undone` (position and size change of each edit made) moves the ones after them. */
export function withoutChanges(
  review: ExternalReview,
  ids: ReadonlySet<string>,
  undone: ReadonlyArray<{ at: number; delta: number }> = [],
): ExternalReview | null {
  const changes = review.changes
    .filter((change) => !ids.has(change.id))
    .map((change) => ({
      ...change,
      at: change.at + undone.filter((edit) => edit.at < change.at).reduce((sum, edit) => sum + edit.delta, 0),
    }));
  return changes.length ? { ...review, changes } : null;
}
