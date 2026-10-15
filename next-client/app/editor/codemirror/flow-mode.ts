import { EditorState, type Extension, type Text } from "@codemirror/state";
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

function buildActiveRange(state: EditorState, level: FlowLevel): DecorationSet {
  const { doc } = state;
  const head = state.selection.main.head;
  const { first, last } = paragraphLinesAt(doc, head);
  const ranges = [];
  for (let n = first; n <= last; n++) ranges.push(activeLine.range(doc.line(n).from));
  if (level === "sentence") {
    const paraFrom = doc.line(first).from;
    const paraTo = doc.line(last).to;
    const { from, to } = sentenceRangeAt(doc, head, first, last);
    if (from > paraFrom) ranges.push(dimmedText.range(paraFrom, from));
    if (to < paraTo) ranges.push(dimmedText.range(to, paraTo));
  }
  return Decoration.set(ranges, true);
}

const focusPlugin = (level: FlowLevel) =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = buildActiveRange(view.state, level);
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet) {
          this.decorations = buildActiveRange(update.state, level);
        }
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
  ".cm-flowDim": {
    transition: DIM_TRANSITION,
  },
  "&.cm-flowMode.cm-focused .cm-flowDim": {
    opacity: "0.25",
  },
  "@media (prefers-reduced-motion: reduce)": {
    "&.cm-flowMode .cm-content > *, .cm-flowDim": {
      transition: "none",
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
