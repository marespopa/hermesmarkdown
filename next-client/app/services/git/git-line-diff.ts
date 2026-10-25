// Whole-line changes between a base text and a document, from
// @codemirror/merge's `Chunk`s. Shared by the editor's Git Changes diff
// (editor/codemirror/git-changes.ts) and the Changes page's worker scan.
// A chunk is widened to whole lines, so the lines both sides share at its
// edges are dropped: pressing Enter at the end of a line would otherwise show
// that line as deleted and added again.
import type { Chunk } from "@codemirror/merge";
import type { Text } from "@codemirror/state";

/** Over this many lines the file shows no diff. */
export const MAX_GIT_LINES = 20000;

/** One change in 1-based, inclusive line numbers; an empty side has last = first - 1. */
export interface LineChange {
  firstA: number;
  lastA: number;
  firstB: number;
  lastB: number;
}

/** Chunk.build's chunks as whole-line changes, the lines both sides share at each edge dropped. */
export function lineChanges(base: Text, doc: Text, chunks: readonly Chunk[]): LineChange[] {
  const result: LineChange[] = [];
  for (const chunk of chunks) {
    let firstA = base.lineAt(chunk.fromA).number;
    let lastA = chunk.fromA === chunk.toA ? firstA - 1 : base.lineAt(chunk.endA).number;
    let firstB = doc.lineAt(chunk.fromB).number;
    let lastB = chunk.fromB === chunk.toB ? firstB - 1 : doc.lineAt(chunk.endB).number;
    while (firstA <= lastA && firstB <= lastB && base.line(firstA).text === doc.line(firstB).text) {
      firstA++;
      firstB++;
    }
    while (firstA <= lastA && firstB <= lastB && base.line(lastA).text === doc.line(lastB).text) {
      lastA--;
      lastB--;
    }
    if (firstA <= lastA || firstB <= lastB) result.push({ firstA, lastA, firstB, lastB });
  }
  return result;
}

export interface GitDiff {
  /** Line numbers (1-based) of added or changed lines. */
  added: number[];
  /** Runs of HEAD's lines that are gone: shown above line `before`, or after the last line when it's past the end. */
  deleted: { before: number; lines: string[] }[];
  /** The line (1-based) each change starts on, in order: its first added line, or the line its deleted block sits on. */
  hunks: number[];
}

/** The diff `chunks` describe, with the lines both sides share at each chunk's edges dropped. */
export function gitDiff(base: Text, doc: Text, chunks: readonly Chunk[]): GitDiff {
  const result: GitDiff = { added: [], deleted: [], hunks: [] };
  // A file new since HEAD: every line is added (an empty Text still has one empty line).
  if (base.length === 0) {
    if (doc.length > 0) {
      for (let number = 1; number <= doc.lines; number++) result.added.push(number);
      result.hunks.push(1);
    }
    return result;
  }
  for (const { firstA, lastA, firstB, lastB } of lineChanges(base, doc, chunks)) {
    result.hunks.push(Math.min(firstB, doc.lines));
    if (firstA <= lastA) {
      const lines: string[] = [];
      for (let number = firstA; number <= lastA; number++) lines.push(base.line(number).text);
      result.deleted.push({ before: firstB, lines });
    }
    for (let number = firstB; number <= lastB; number++) result.added.push(number);
  }
  return result;
}
