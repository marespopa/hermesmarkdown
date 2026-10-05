import { EditorSelection } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { indentLess, indentMore } from "@codemirror/commands";
import { indentSubtree, outdentSubtree } from "./lineMutations";

// indent, bullet or "1." / "1)", spacing, optional task box.
const LIST_ITEM = /^(\s*)([-*+]|(\d+)([.)]))(\s+)(\[[ xX/-]\]\s+)?/;
const INDENT = "  ";

// Enter on a list item starts the next item: same bullet, next number, and a
// fresh "[ ] " for task items. Enter on an empty item outdents it one level,
// or ends the list when it's already at the top level.
export function continueListOnEnter(view: EditorView): boolean {
  const { state } = view;
  const { from, to } = state.selection.main;
  const line = state.doc.lineAt(from);
  if (state.doc.lineAt(to).number !== line.number) return false;
  const match = LIST_ITEM.exec(line.text);
  if (!match) return false;

  const prefixEnd = line.from + match[0].length;
  if (from < prefixEnd) return false; // cursor sits in the marker: plain newline

  const [, indent, bullet, number, delimiter, spacing, task] = match;
  if (line.text.slice(match[0].length).trim() === "") {
    if (indent.length > 0) {
      const removed = indent.startsWith(INDENT) ? INDENT.length : 1;
      view.dispatch({
        changes: { from: line.from, to: line.from + removed },
        userEvent: "delete.format.list",
      });
    } else {
      view.dispatch({
        changes: { from: line.from, to: line.to },
        userEvent: "delete.format.list",
      });
    }
    return true;
  }

  const marker = number !== undefined ? `${Number(number) + 1}${delimiter}` : bullet;
  const insert = `\n${indent}${marker}${spacing}${task ? "[ ] " : ""}`;
  view.dispatch({
    changes: { from, to, insert },
    selection: EditorSelection.cursor(from + insert.length),
    userEvent: "input.format.list",
    scrollIntoView: true,
  });
  return true;
}

function spansLines(view: EditorView): boolean {
  const { from, to } = view.state.selection.main;
  return view.state.doc.lineAt(from).number !== view.state.doc.lineAt(to).number;
}

// Tab on a list item nests it (with its children) one level deeper; on any
// other line, or a selection spanning several lines, it indents the lines.
export function indentListOrLines(view: EditorView): boolean {
  if (!spansLines(view)) {
    const line = view.state.doc.lineAt(view.state.selection.main.head);
    if (LIST_ITEM.test(line.text)) return indentSubtree(view, line.number) || true;
  }
  return indentMore(view);
}

export function outdentListOrLines(view: EditorView): boolean {
  if (!spansLines(view)) {
    const line = view.state.doc.lineAt(view.state.selection.main.head);
    if (LIST_ITEM.test(line.text)) return outdentSubtree(view, line.number) || true;
  }
  return indentLess(view);
}
