import { EditorState, type Extension, type Range, type Text } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";

// Flow mode: a distraction-light writing mode with two parts.
//   1. Paragraph or sentence focus — every line outside the caret's paragraph
//      fades while the editor has focus, so only the current thought stays at
//      full strength. At the sentence level the rest of that paragraph fades
//      too, leaving only the caret's sentence.
//   2. Typewriter scrolling — typing and keyboard navigation keep the caret
//      line centred vertically instead of drifting to the bottom edge.
// Both are view-only: nothing about the document or its Markdown changes.

const BLANK_LINE = /^\s*$/;
// Upper bound on how far the paragraph scan walks in either direction, so a
// huge unbroken block (a pasted log, say) can't make each keystroke O(n).
const MAX_PARAGRAPH_LINES = 400;

// Returns the 1-based line numbers bounding the paragraph at `pos`: the run of
// non-blank lines around it. A blank line is its own paragraph.
export function paragraphLinesAt(doc: Text, pos: number): { first: number; last: number } {
  const line = doc.lineAt(pos);
  if (BLANK_LINE.test(line.text)) return { first: line.number, last: line.number };
  let first = line.number;
  let last = line.number;
  while (first > 1 && line.number - first < MAX_PARAGRAPH_LINES && !BLANK_LINE.test(doc.line(first - 1).text)) {
    first--;
  }
  while (last < doc.lines && last - line.number < MAX_PARAGRAPH_LINES && !BLANK_LINE.test(doc.line(last + 1).text)) {
    last++;
  }
  return { first, last };
}

export type FlowLevel = "paragraph" | "sentence";

// Sentence ends: . ! ? or … plus any closing quotes or brackets, then
// whitespace and a character that isn't a lowercase letter (so "e.g. this"
// stays one sentence). A line that starts a Markdown block (heading, list
// item, quote, table row), or follows a line ending a sentence, also starts
// one.
const SENTENCE_END = /[.!?…]+["'”’)\]*]*\s+(?=[^\s\p{Ll}])/gu;
const BLOCK_START = /^\s*(#{1,6}\s|[-*+]\s|\d+[.)]\s|>|\|)/;
const LINE_END = /[.!?…]+["'”’)\]*]*\s*$/;

// Document offsets [from, to) of the sentence around `pos`, within the
// paragraph spanning lines `first`–`last`. Trailing whitespace stays with
// the sentence it follows.
export function sentenceRangeAt(doc: Text, pos: number, first: number, last: number): { from: number; to: number } {
  const starts = [doc.line(first).from];
  for (let n = first; n <= last; n++) {
    const line = doc.line(n);
    if (n > first && (BLOCK_START.test(line.text) || LINE_END.test(doc.line(n - 1).text))) starts.push(line.from);
    for (const match of line.text.matchAll(SENTENCE_END)) {
      const at = line.from + match.index + match[0].length;
      if (at < line.to) starts.push(at);
    }
  }
  starts.sort((a, b) => a - b);
  let from = starts[0];
  let to = doc.line(last).to;
  for (const start of starts) {
    if (start <= pos) from = start;
    else {
      to = start;
      break;
    }
  }
  return { from, to };
}

const activeLine = Decoration.line({ class: "cm-flowActive" });
const dimmedText = Decoration.mark({ class: "cm-flowDim" });
// Text that just changed state as the caret moved to another sentence of the
// same paragraph: it fades instead of switching. Marks are re-created spans,
// so a CSS transition can't run on them; a one-off animation does, and the
// next update drops these classes again.
const fadingOut = Decoration.mark({ class: "cm-flowDim cm-flowDimEnter" });
const fadingIn = Decoration.mark({ class: "cm-flowEnter" });

interface Span {
  from: number;
  to: number;
}

// `range` dimmed, with the part inside `left` (the sentence just left) fading.
function dimRange(ranges: Range<Decoration>[], range: Span, left: Span | null) {
  if (range.from >= range.to) return;
  const cutFrom = left ? Math.max(range.from, left.from) : range.to;
  const cutTo = left ? Math.min(range.to, left.to) : range.to;
  if (cutFrom >= cutTo) {
    ranges.push(dimmedText.range(range.from, range.to));
    return;
  }
  if (range.from < cutFrom) ranges.push(dimmedText.range(range.from, cutFrom));
  ranges.push(fadingOut.range(cutFrom, cutTo));
  if (cutTo < range.to) ranges.push(dimmedText.range(cutTo, range.to));
}

// The decorations, and the caret's sentence. `previous` is the sentence the
// caret was in before a caret-only move, or null (typing, first build).
export function buildActiveRange(
  state: EditorState,
  level: FlowLevel,
  previous: Span | null = null,
): { decorations: DecorationSet; sentence: Span | null } {
  const { doc } = state;
  const head = state.selection.main.head;
  const { first, last } = paragraphLinesAt(doc, head);
  const ranges: Range<Decoration>[] = [];
  for (let n = first; n <= last; n++) ranges.push(activeLine.range(doc.line(n).from));
  if (level !== "sentence") return { decorations: Decoration.set(ranges, true), sentence: null };
  const paraFrom = doc.line(first).from;
  const paraTo = doc.line(last).to;
  const sentence = sentenceRangeAt(doc, head, first, last);
  // Only a move to another sentence of this paragraph fades: entering a new
  // paragraph already fades its lines in.
  const moved = previous !== null
    && (previous.from !== sentence.from || previous.to !== sentence.to)
    && previous.from >= paraFrom && previous.to <= paraTo;
  const left = moved ? previous : null;
  dimRange(ranges, { from: paraFrom, to: sentence.from }, left);
  if (moved && sentence.from < sentence.to) ranges.push(fadingIn.range(sentence.from, sentence.to));
  dimRange(ranges, { from: sentence.to, to: paraTo }, left);
  return { decorations: Decoration.set(ranges, true), sentence };
}

const focusPlugin = (level: FlowLevel) =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      sentence: Span | null;
      constructor(view: EditorView) {
        ({ decorations: this.decorations, sentence: this.sentence } = buildActiveRange(view.state, level));
      }
      update(update: ViewUpdate) {
        if (!update.docChanged && !update.selectionSet) return;
        const previous = update.docChanged ? null : this.sentence;
        ({ decorations: this.decorations, sentence: this.sentence } = buildActiveRange(update.state, level, previous));
      }
    },
    { decorations: (plugin) => plugin.decorations },
  );

// Only caret movement the writer drives from the keyboard re-centres the view.
// Pointer selections are left alone (centring under the mouse would break drag
// selection), as are programmatic changes such as external file reloads.
const TYPEWRITER_EVENTS = ["input", "delete", "undo", "redo", "move", "select"];

export function shouldTypewriterScroll(userEvents: (event: string) => boolean): boolean {
  if (userEvents("select.pointer") || userEvents("input.external")) return false;
  return TYPEWRITER_EVENTS.some((event) => userEvents(event));
}

const typewriterScroll = EditorState.transactionExtender.of((tr) => {
  if (!tr.docChanged && !tr.selection) return null;
  if (!shouldTypewriterScroll((event) => tr.isUserEvent(event))) return null;
  return { effects: EditorView.scrollIntoView(tr.newSelection.main.head, { y: "center" }) };
});

const DIM_TRANSITION = "opacity 200ms ease, background-color 150ms ease, color 150ms ease";

const flowModeTheme = EditorView.theme({
  // Room below the last line so the end of the note can still reach centre.
  "&.cm-flowMode .cm-content": {
    paddingBottom: "45vh",
  },
  "&.cm-flowMode .cm-content > *": {
    transition: DIM_TRANSITION,
  },
  "&.cm-flowMode.cm-focused .cm-content > *": {
    opacity: "0.25",
  },
  "&.cm-flowMode.cm-focused .cm-content > .cm-flowActive": {
    opacity: "1",
  },
  "&.cm-flowMode.cm-focused .cm-flowDim": {
    opacity: "0.25",
  },
  "&.cm-flowMode.cm-focused .cm-flowDimEnter": {
    animation: "cm-flow-fade-out 200ms ease",
  },
  "&.cm-flowMode.cm-focused .cm-flowEnter": {
    animation: "cm-flow-fade-in 200ms ease",
  },
  "@keyframes cm-flow-fade-out": {
    from: { opacity: "1" },
    to: { opacity: "0.25" },
  },
  "@keyframes cm-flow-fade-in": {
    from: { opacity: "0.25" },
    to: { opacity: "1" },
  },
  "@media (prefers-reduced-motion: reduce)": {
    "&.cm-flowMode .cm-content > *": {
      transition: "none",
    },
    "&.cm-flowMode.cm-focused .cm-flowDimEnter, &.cm-flowMode.cm-focused .cm-flowEnter": {
      animation: "none",
    },
  },
});

export function flowMode(level: FlowLevel = "paragraph"): Extension {
  return [
    EditorView.editorAttributes.of({ class: "cm-flowMode" }),
    focusPlugin(level),
    typewriterScroll,
    flowModeTheme,
  ];
}
