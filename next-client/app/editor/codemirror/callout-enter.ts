import type { EditorView } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";

// A line's `>`s with the spaces after each: `> `, `>> `, `> > `.
const REGEX_QUOTE_PREFIX = /^[ \t]*(?:>[ \t]*)+/;
// `> [!type]` at a line's start (the callout's title line).
const REGEX_CALLOUT_TITLE = /^[ \t]*(?:>[ \t]*)+\[!\w+\]/;

// Whether line `number` belongs to a callout: its run of `>` lines, read up
// from the line, holds a title line.
function inCallout(view: EditorView, number: number): boolean {
  const { doc } = view.state;
  for (let n = number; n >= 1; n--) {
    const text = doc.line(n).text;
    if (!REGEX_QUOTE_PREFIX.test(text)) return false;
    if (REGEX_CALLOUT_TITLE.test(text)) return true;
  }
  return false;
}

// Enter in a callout: the next line starts with the same `>` prefix, so the
// callout goes on (text after the caret moves down into it), empty rows
// included: it only stops when the `>` is deleted or Shift+Enter is pressed,
// which stays a plain line break. Returns false where it doesn't apply (a
// selection, a caret inside the prefix, a line outside a callout), leaving
// the plain line break to the keymap.
export function continueCallout(view: EditorView): boolean {
  const { state } = view;
  if (state.selection.ranges.length !== 1 || !state.selection.main.empty) return false;
  const head = state.selection.main.head;
  const line = state.doc.lineAt(head);
  const prefix = REGEX_QUOTE_PREFIX.exec(line.text)?.[0];
  if (!prefix || head < line.from + prefix.length || !inCallout(view, line.number)) return false;

  const insert = `\n${prefix}`;
  view.dispatch({
    changes: { from: head, insert },
    selection: EditorSelection.cursor(head + insert.length),
    scrollIntoView: true,
    userEvent: "input",
  });
  return true;
}
