import { EditorSelection } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { isInCode } from "./template-field-pills";

// A "-" typed as the first thing on a line (after any indent or "> ") is
// almost always a bullet, so it goes in as "- " with the cursor after the
// space. The follow-ups that would otherwise fight it:
//   - a space typed right after the bullet is swallowed (no "-  ");
//   - a second "-" turns "- " back into "--", so "---" (a rule, or the
//     frontmatter fence) still types as three dashes.
// Code blocks and multi-cursor edits are left alone.

const LINE_START = /^[\t ]*(>[\t ]?)*$/;
const BARE_BULLET = /^[\t ]*(>[\t ]?)*- $/;

export const bulletAutospace = EditorView.inputHandler.of((view, from, to, text) => {
  const { state } = view;
  if (state.selection.ranges.length > 1 || from !== to) return false;
  if (text !== "-" && text !== " ") return false;
  const line = state.doc.lineAt(from);
  const before = line.text.slice(0, from - line.from);
  const after = line.text.slice(from - line.from);
  if (isInCode(state, from)) return false;

  if (BARE_BULLET.test(before) && !after.trim()) {
    if (text === " ") return true;
    view.dispatch({
      changes: { from: from - 1, to: from, insert: "-" },
      selection: EditorSelection.cursor(from),
      userEvent: "input.type",
    });
    return true;
  }

  if (text === "-" && LINE_START.test(before) && !after.startsWith(" ") && !after.startsWith("-")) {
    view.dispatch({
      changes: { from, insert: "- " },
      selection: EditorSelection.cursor(from + 2),
      userEvent: "input.type",
    });
    return true;
  }
  return false;
});
