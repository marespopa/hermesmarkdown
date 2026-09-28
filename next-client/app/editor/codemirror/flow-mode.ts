import { EditorState, type Extension, type Text } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";

// Flow mode: a distraction-light writing mode with two parts.
//   1. Paragraph focus — every line outside the caret's paragraph fades while
//      the editor has focus, so only the current thought stays at full strength.
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

const activeLine = Decoration.line({ class: "cm-flowActive" });

function buildActiveParagraph(state: EditorState): DecorationSet {
  const { doc } = state;
  const { first, last } = paragraphLinesAt(doc, state.selection.main.head);
  const ranges = [];
  for (let n = first; n <= last; n++) ranges.push(activeLine.range(doc.line(n).from));
  return Decoration.set(ranges);
}

const paragraphFocusPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildActiveParagraph(view.state);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet) {
        this.decorations = buildActiveParagraph(update.state);
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
  "@media (prefers-reduced-motion: reduce)": {
    "&.cm-flowMode .cm-content > *": {
      transition: "none",
    },
  },
});

export function flowMode(): Extension {
  return [
    EditorView.editorAttributes.of({ class: "cm-flowMode" }),
    paragraphFocusPlugin,
    typewriterScroll,
    flowModeTheme,
  ];
}
