import { StateEffect, type ChangeDesc } from "@codemirror/state";

// Large notes reveal their tables in stages (table-display.tsx): the text
// shows first, then the tables on screen, then the rest of the note's in
// idle chunks, so opening one never waits on every table being found and
// computed. Small notes find every table at once, as before.

/** Notes longer than this (lines) reveal their tables in stages. */
export const STAGED_REVEAL_LINES = 3000;
/** Lines each idle chunk covers. */
export const STAGED_CHUNK_LINES = 2000;

export type Range = { from: number; to: number };

/** Find the tables in this range of the document from now on. */
export const revealTablesIn = StateEffect.define<Range>();

/** `ranges` with `add` merged in: sorted, overlapping or touching ranges joined. */
export function addRange(ranges: readonly Range[], add: Range): Range[] {
  const all = [...ranges, add].sort((a, b) => a.from - b.from);
  const merged: Range[] = [];
  for (const range of all) {
    const last = merged[merged.length - 1];
    if (last && range.from <= last.to + 1) last.to = Math.max(last.to, range.to);
    else merged.push({ ...range });
  }
  return merged;
}

export const mapRanges = (ranges: readonly Range[], changes: ChangeDesc): Range[] =>
  ranges.map((range) => ({ from: changes.mapPos(range.from, -1), to: changes.mapPos(range.to, 1) }));

/** Whether `ranges` cover the whole document of length `length`. */
export const coversAll = (ranges: readonly Range[], length: number) =>
  ranges.length === 1 && ranges[0].from <= 0 && ranges[0].to >= length;

/** The first stretch of `length` not in `ranges`, or null when all of it is covered. */
export function firstGap(ranges: readonly Range[], length: number): Range | null {
  let pos = 0;
  for (const range of ranges) {
    if (range.from > pos) return { from: pos, to: range.from };
    pos = Math.max(pos, range.to + 1);
  }
  return pos <= length ? { from: pos, to: length } : null;
}
