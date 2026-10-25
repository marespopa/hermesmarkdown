// Git Changes (Settings → Editor → View): an inline diff against the file at
// HEAD, the way a pull request shows it. Added and changed lines get a green
// tint and a +, and the lines they replaced or that were deleted sit above
// them, read-only, on a red tint with a −. The baseline (HEAD's text) arrives
// through `setGitBaseline` from use-git-baseline.ts. Chunks come from
// @codemirror/merge's `Chunk` (built once, then updated with each edit), and
// the lines both sides share at a chunk's edges are dropped: a chunk is
// widened to whole lines, so pressing Enter at the end of a line would
// otherwise show that line as deleted and added again.
import { Chunk } from "@codemirror/merge";
import { type EditorState, type Extension, type Range, StateEffect, StateField, Text } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, WidgetType } from "@codemirror/view";

/** Over this many lines the file shows no diff. */
export const MAX_GIT_LINES = 20000;

/** HEAD's text, null for "no baseline" (every line added), or "off" (no diff). */
export type GitBaseline = { text: string | null } | "off";

export const setGitBaseline = StateEffect.define<GitBaseline>();

export interface GitDiff {
  /** Line numbers (1-based) of added or changed lines. */
  added: number[];
  /** Runs of HEAD's lines that are gone: shown above line `before`, or after the last line when it's past the end. */
  deleted: { before: number; lines: string[] }[];
}

/** The diff `chunks` describe, with the lines both sides share at each chunk's edges dropped. */
export function gitDiff(base: Text, doc: Text, chunks: readonly Chunk[]): GitDiff {
  const result: GitDiff = { added: [], deleted: [] };
  // A file new since HEAD: every line is added (an empty Text still has one empty line).
  if (base.length === 0) {
    if (doc.length > 0) for (let number = 1; number <= doc.lines; number++) result.added.push(number);
    return result;
  }
  for (const chunk of chunks) {
    let firstA = base.lineAt(chunk.fromA).number;
    let lastA = chunk.fromA === chunk.toA ? firstA - 1 : base.lineAt(chunk.endA).number;
    let first = doc.lineAt(chunk.fromB).number;
    let last = chunk.fromB === chunk.toB ? first - 1 : doc.lineAt(chunk.endB).number;
    while (firstA <= lastA && first <= last && base.line(firstA).text === doc.line(first).text) {
      firstA++;
      first++;
    }
    while (firstA <= lastA && first <= last && base.line(lastA).text === doc.line(last).text) {
      lastA--;
      last--;
    }
    if (firstA <= lastA) {
      const lines: string[] = [];
      for (let number = firstA; number <= lastA; number++) lines.push(base.line(number).text);
      result.deleted.push({ before: first, lines });
    }
    for (let number = first; number <= last; number++) result.added.push(number);
  }
  return result;
}

class DeletedLinesWidget extends WidgetType {
  constructor(readonly lines: string[]) {
    super();
  }
  eq(other: DeletedLinesWidget) {
    return other.lines.length === this.lines.length && other.lines.every((line, i) => line === this.lines[i]);
  }
  toDOM() {
    const block = document.createElement("div");
    block.className = "cm-git-deleted";
    block.setAttribute("aria-hidden", "true");
    for (const text of this.lines) {
      const line = block.appendChild(document.createElement("div"));
      line.className = "cm-git-deletedLine";
      if (text) line.textContent = text;
      else line.appendChild(document.createElement("br"));
    }
    return block;
  }
  ignoreEvent() {
    return true;
  }
}

const addedLine = Decoration.line({ class: "cm-git-added" });

function decorate(diff: GitDiff, doc: Text): DecorationSet {
  const ranges: Range<Decoration>[] = diff.added.map((number) => addedLine.range(doc.line(number).from));
  for (const { before, lines } of diff.deleted) {
    const atEnd = before > doc.lines;
    const widget = Decoration.widget({ widget: new DeletedLinesWidget(lines), block: true, side: atEnd ? 1 : -1 });
    ranges.push(widget.range(atEnd ? doc.length : doc.line(before).from));
  }
  return Decoration.set(ranges, true);
}

interface GitChangesValue {
  /** HEAD's text, or null while there's no diff to show. */
  base: Text | null;
  chunks: readonly Chunk[];
  decorations: DecorationSet;
}

const EMPTY: GitChangesValue = { base: null, chunks: [], decorations: Decoration.none };

function withChunks(base: Text, doc: Text, chunks: readonly Chunk[]): GitChangesValue {
  return { base, chunks, decorations: decorate(gitDiff(base, doc, chunks), doc) };
}

function fromBaseline(baseline: GitBaseline, state: EditorState): GitChangesValue {
  if (baseline === "off" || state.doc.lines > MAX_GIT_LINES) return EMPTY;
  const base = baseline.text === null ? Text.empty : Text.of(baseline.text.split(/\r?\n/));
  return withChunks(base, state.doc, Chunk.build(base, state.doc));
}

export const gitChangesField = StateField.define<GitChangesValue>({
  create: () => EMPTY,
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setGitBaseline)) return fromBaseline(effect.value, transaction.state);
    }
    if (!value.base || !transaction.docChanged) return value;
    if (transaction.newDoc.lines > MAX_GIT_LINES) return EMPTY;
    return withChunks(value.base, transaction.newDoc, Chunk.updateB(value.chunks, value.base, transaction.newDoc, transaction.changes));
  },
  provide: (field) => EditorView.decorations.from(field, (value) => value.decorations),
});

// The + / − sit in the leading margin, in the code face.
const SIGN = { position: "absolute", left: "-1.25em", width: "1em", textAlign: "center", fontFamily: "var(--font-code)", fontWeight: "400" };

const gitChangesTheme = EditorView.baseTheme({
  ".cm-git-added": { position: "relative", backgroundColor: "color-mix(in srgb, var(--task-done) 22%, transparent)" },
  ".cm-git-added::before": { ...SIGN, content: '"+"', color: "var(--task-done)" },
  ".cm-git-deleted": { backgroundColor: "color-mix(in srgb, var(--danger) 16%, transparent)", userSelect: "none", cursor: "default" },
  ".cm-git-deletedLine": { position: "relative", padding: "0 2px 0 6px", color: "var(--fg-muted)", whiteSpace: "pre-wrap" },
  ".cm-git-deletedLine::before": { ...SIGN, content: '"−"', color: "var(--danger)" },
});

export function gitChanges(): Extension {
  return [gitChangesField, gitChangesTheme];
}
