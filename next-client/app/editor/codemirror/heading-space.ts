import { EditorView } from "@codemirror/view";
import { StateEffect, StateField } from "@codemirror/state";
import { frontmatterRangeOf } from "./frontmatter-block";
import { inCode } from "./html-paste";

// `#` typed at the start of a line is most likely a heading, so it brings
// its space along: `# `, with the caret after it. On an empty line, and in
// front of a line's text too (`#` before `Title` gives `# Title`). The keys
// right after stay what they would have been without the help:
// - another `#` deepens the heading (`## `, up to six) rather than landing
//   after the space;
// - a space typed out of habit is taken as the one already there.
// Both only straight after the added space: any other key, click or edit
// ends it, and from then on typing is plain. Not in code or frontmatter
// (where `#` is a comment, a shebang, a selector), not in front of a space or
// another `#`, only a single plain caret, never while composing.

// Where the caret sits right after a space this added, or null.
const setAddedAt = StateEffect.define<number | null>();
const addedAt = StateField.define<number | null>({
  create: () => null,
  update(value, tr) {
    for (const effect of tr.effects) if (effect.is(setAddedAt)) return effect.value;
    return tr.docChanged || tr.selection ? null : value;
  },
});

const handler = EditorView.inputHandler.of((view, from, to, text) => {
  if (text !== "#" && text !== " ") return false;
  const { state } = view;
  if (view.composing || state.readOnly || from !== to) return false;
  if (state.selection.ranges.length > 1 || !state.selection.main.empty) return false;
  const line = state.doc.lineAt(from);
  const before = line.text.slice(0, from - line.from);

  if (state.field(addedAt) === from && /^#{1,6} $/.test(before)) {
    if (text === " ") {
      // The space is already there; a second one is typed plainly.
      view.dispatch({ effects: setAddedAt.of(null) });
      return true;
    }
    // Seven marks are no heading: leave that to plain typing.
    if (before.length > 6) return false;
    view.dispatch({
      changes: { from: from - 1, insert: "#" },
      selection: { anchor: from + 1 },
      effects: setAddedAt.of(from + 1),
      scrollIntoView: true,
      userEvent: "input.type",
    });
    return true;
  }

  if (text !== "#" || before !== "" || /^[ \t#]/.test(line.text)) return false;
  const frontmatter = frontmatterRangeOf(state.doc);
  if ((frontmatter && from <= frontmatter.closeTo) || inCode(state, from)) return false;
  view.dispatch({
    changes: { from, insert: "# " },
    selection: { anchor: from + 2 },
    effects: setAddedAt.of(from + 2),
    scrollIntoView: true,
    userEvent: "input.type",
  });
  return true;
});

export const headingSpace = [addedAt, handler];
