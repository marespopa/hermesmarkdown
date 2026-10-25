// Git Changes (the editor's git menu, the palette): an inline diff against the file at
// HEAD, the way a pull request shows it. Added and changed lines get a green
// tint and a +, and the lines they replaced or that were deleted sit above
// them, read-only, on a red tint with a −. The baseline (HEAD's text) arrives
// through `setGitBaseline` from use-git-baseline.ts. Chunks come from
// @codemirror/merge's `Chunk` (built once, then updated with each edit), and
// the lines both sides share at a chunk's edges are dropped: a chunk is
// widened to whole lines, so pressing Enter at the end of a line would
// otherwise show that line as deleted and added again. Only the deleted
// blocks are built for the whole file; the added lines' marks and tint are
// drawn for the viewport, so typing in a long new file stays cheap.
import { Chunk } from "@codemirror/merge";
import { EditorSelection, type EditorState, type Extension, Facet, type Range, StateEffect, StateField, Text } from "@codemirror/state";
import { Decoration, type DecorationSet, Direction, EditorView, keymap, layer, RectangleMarker, ViewPlugin, type ViewUpdate, WidgetType } from "@codemirror/view";
import { flashLine } from "../utils/flash-line";
import { gitDiff, type GitDiff, MAX_GIT_LINES } from "@/app/services/git/git-line-diff";

export { gitDiff, MAX_GIT_LINES, type GitDiff } from "@/app/services/git/git-line-diff";

/** HEAD's text, null for "no baseline" (every line added), or "off" (no diff). */
export type GitBaseline = { text: string | null } | "off";

export const setGitBaseline = StateEffect.define<GitBaseline>();

/**
 * Ranges other extensions replace with a block widget (tables, rendered
 * diagrams and math). A deleted block that would fall inside one is shown
 * above it instead, where the widget can't hide it.
 */
export const gitReplacedBlocks = Facet.define<(state: EditorState) => readonly { from: number; to: number }[]>();

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

// Diffs run on the main thread (on a new baseline and on each edit): a large,
// very different file falls back to a faster, coarser diff instead of stalling.
const DIFF_CONFIG: Parameters<typeof Chunk.build>[2] = { scanLimit: 500, timeout: 50 };

// The deleted blocks, for the whole file: they change the layout, so they
// can't be left to the viewport.
function decorate(diff: GitDiff, state: EditorState): DecorationSet {
  const { doc } = state;
  const blocks = state.facet(gitReplacedBlocks).flatMap((find) => find(state));
  const ranges: Range<Decoration>[] = [];
  for (const { before, lines } of diff.deleted) {
    let atEnd = before > doc.lines;
    let pos = atEnd ? doc.length : doc.line(before).from;
    const block = blocks.find((range) => pos > range.from && pos <= range.to);
    if (block) {
      pos = block.from;
      atEnd = false;
    }
    const widget = Decoration.widget({ widget: new DeletedLinesWidget(lines), block: true, side: atEnd ? 1 : -1 });
    ranges.push(widget.range(pos));
  }
  return Decoration.set(ranges, true);
}

interface GitChangesValue {
  /** HEAD's text, or null while there's no diff to show. */
  base: Text | null;
  chunks: readonly Chunk[];
  diff: GitDiff;
  /** Where each change starts (line starts), for next / previous change. */
  hunks: number[];
}

const EMPTY: GitChangesValue = { base: null, chunks: [], diff: { added: [], deleted: [], hunks: [] }, hunks: [] };

/**
 * Runs of added lines (sorted line numbers) between positions `from` and
 * `to`, from a run's first line start to its last line end, clipped to the
 * lines there: the tint layer's ranges.
 */
export function addedRunsIn(added: readonly number[], doc: Text, from: number, to: number): { from: number; to: number }[] {
  const first = doc.lineAt(from).number;
  const last = doc.lineAt(to).number;
  let low = 0;
  let high = added.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (added[mid] < first) low = mid + 1;
    else high = mid;
  }
  const runs: { from: number; to: number }[] = [];
  for (let i = low; i < added.length && added[i] <= last; i++) {
    const start = added[i];
    while (i + 1 < added.length && added[i + 1] === added[i] + 1 && added[i + 1] <= last) i++;
    runs.push({ from: doc.line(start).from, to: doc.line(added[i]).to });
  }
  return runs;
}

function withChunks(base: Text, doc: Text, chunks: readonly Chunk[]): GitChangesValue {
  const diff = gitDiff(base, doc, chunks);
  return { base, chunks, diff, hunks: diff.hunks.map((number) => doc.line(number).from) };
}

function fromBaseline(baseline: GitBaseline, state: EditorState): GitChangesValue {
  if (baseline === "off" || state.doc.lines > MAX_GIT_LINES) return EMPTY;
  const base = baseline.text === null ? Text.empty : Text.of(baseline.text.split(/\r?\n/));
  return withChunks(base, state.doc, Chunk.build(base, state.doc, DIFF_CONFIG));
}

export const gitChangesField = StateField.define<GitChangesValue>({
  create: () => EMPTY,
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setGitBaseline)) return fromBaseline(effect.value, transaction.state);
    }
    if (!value.base || !transaction.docChanged) return value;
    if (transaction.newDoc.lines > MAX_GIT_LINES) return EMPTY;
    return withChunks(value.base, transaction.newDoc, Chunk.updateB(value.chunks, value.base, transaction.newDoc, transaction.changes, DIFF_CONFIG));
  },
});

// Computed after the fields `gitReplacedBlocks` reads (tables come later in
// the note editor's extensions), and provided directly, so the deleted
// blocks may change the layout.
const gitDecorations = EditorView.decorations.compute([gitChangesField, gitReplacedBlocks], (state) =>
  decorate(state.field(gitChangesField).diff, state),
);

const diffChanged = (update: ViewUpdate) => update.startState.field(gitChangesField, false) !== update.state.field(gitChangesField, false);

const visibleRuns = (view: EditorView) =>
  addedRunsIn(view.state.field(gitChangesField, false)?.diff.added ?? [], view.state.doc, view.viewport.from, view.viewport.to);

// The added lines' `+`, for the lines in the viewport only.
const addedLines = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || diffChanged(update)) this.decorations = this.build(update.view);
    }
    build(view: EditorView): DecorationSet {
      const { doc } = view.state;
      const ranges: Range<Decoration>[] = [];
      for (const run of visibleRuns(view)) {
        for (let number = doc.lineAt(run.from).number, end = doc.lineAt(run.to).number; number <= end; number++) ranges.push(addedLine.range(doc.line(number).from));
      }
      return Decoration.set(ranges);
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

// The added lines' tint, drawn behind the text like the selection rather
// than as a line background: code blocks and callouts paint their own line
// backgrounds over a line's, and a table replaces its lines with a widget.
const addedTint = layer({
  above: false,
  class: "cm-git-addedLayer",
  update: (update) => update.docChanged || update.viewportChanged || update.geometryChanged || diffChanged(update),
  markers(view) {
    const { doc } = view.state;
    const markers: RectangleMarker[] = [];
    const visible = visibleRuns(view);
    for (const run of visible) {
      // Through the line break, so the tint spans the line's full width.
      const end = run.to < doc.length ? run.to + 1 : run.to;
      markers.push(...RectangleMarker.forRange(view, "cm-git-addedTint", EditorSelection.range(run.from, end)));
    }
    markers.push(...blockMarkers(view, visible));
    return markers;
  },
});

// The element CodeMirror drew for the block widget at `pos`: a direct child
// of the content element.
function blockElement(view: EditorView, pos: number): HTMLElement | null {
  const { node, offset } = view.domAtPos(pos);
  let element: Node | null = node === view.contentDOM ? (node.childNodes[offset] ?? null) : node;
  while (element && element.parentNode !== view.contentDOM) element = element.parentNode;
  return element instanceof HTMLElement ? element : null;
}

// A table or rendered block hides its lines behind a widget, which the range
// tint doesn't cover and which takes the lines' `+` with it: each such block
// holding added lines gets the tint over its own box and one `+` in the margin
// beside its top row.
function blockMarkers(view: EditorView, runs: readonly { from: number; to: number }[]): RectangleMarker[] {
  if (runs.length === 0) return [];
  const blocks = view.state.facet(gitReplacedBlocks).flatMap((find) => find(view.state));
  const changed = blocks.filter((block) => runs.some((run) => run.from <= block.to && run.to >= block.from));
  if (changed.length === 0) return [];
  const scroller = view.scrollDOM.getBoundingClientRect();
  const baseLeft = (view.textDirection === Direction.LTR ? scroller.left : scroller.right - view.scrollDOM.clientWidth * view.scaleX) - view.scrollDOM.scrollLeft * view.scaleX;
  const baseTop = scroller.top - view.scrollDOM.scrollTop * view.scaleY;
  const em = parseFloat(getComputedStyle(view.contentDOM).fontSize) || 16;
  const markers: RectangleMarker[] = [];
  for (const block of changed) {
    const element = blockElement(view, block.from);
    if (!element) continue;
    const rect = element.getBoundingClientRect();
    const left = (rect.left - baseLeft) / view.scaleX;
    const top = (rect.top - baseTop) / view.scaleY;
    markers.push(new RectangleMarker("cm-git-addedTint", left, top, rect.width / view.scaleX, rect.height / view.scaleY));
    markers.push(new RectangleMarker("cm-git-blockSign", left - 1.25 * em, top, em, Math.min(view.defaultLineHeight * 1.6, rect.height / view.scaleY)));
  }
  return markers;
}

// Moves the caret to the start of the next (or previous) change, wrapping
// around the file, and flashes that line. False when there are no changes.
function goToChange(view: EditorView, direction: 1 | -1): boolean {
  const hunks = view.state.field(gitChangesField, false)?.hunks ?? [];
  if (hunks.length === 0) return false;
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  const target =
    direction === 1
      ? (hunks.find((pos) => pos > line.from) ?? hunks[0])
      : ([...hunks].reverse().find((pos) => pos < line.from) ?? hunks[hunks.length - 1]);
  view.dispatch({ selection: { anchor: target }, effects: EditorView.scrollIntoView(target, { y: "center" }), userEvent: "select" });
  view.focus();
  flashLine(view, target);
  return true;
}

export const goToNextGitChange = (view: EditorView) => goToChange(view, 1);
export const goToPreviousGitChange = (view: EditorView) => goToChange(view, -1);

// The + / − sit in the leading margin, in the code face.
const SIGN = { position: "absolute", left: "-1.25em", width: "1em", textAlign: "center", fontFamily: "var(--font-code)", fontWeight: "400" };

const gitChangesTheme = EditorView.baseTheme({
  ".cm-git-added": { position: "relative" },
  ".cm-git-blockSign": { display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-code)", color: "var(--task-done)" },
  ".cm-git-blockSign::before": { content: '"+"' },
  ".cm-git-addedTint": { backgroundColor: "color-mix(in srgb, var(--task-done) 22%, transparent)" },
  ".cm-git-added::before": { ...SIGN, content: '"+"', color: "var(--task-done)" },
  ".cm-git-deleted": { backgroundColor: "color-mix(in srgb, var(--danger) 16%, transparent)", userSelect: "none", cursor: "default" },
  ".cm-git-deletedLine": { position: "relative", padding: "0 2px 0 6px", color: "var(--fg-muted)", whiteSpace: "pre-wrap" },
  ".cm-git-deletedLine::before": { ...SIGN, content: '"−"', color: "var(--danger)" },
});

export function gitChanges(): Extension {
  return [
    gitChangesField,
    gitDecorations,
    addedLines,
    addedTint,
    gitChangesTheme,
    keymap.of([
      { key: "Alt-F5", run: goToNextGitChange, preventDefault: true },
      { key: "Shift-Alt-F5", run: goToPreviousGitChange, preventDefault: true },
    ]),
  ];
}
