import type { EditorView } from "@codemirror/view";
import { tidyNote } from "../utils/tidy-note";

/** Tidies the whole note as one undoable edit. False when there was nothing to change. */
export function runTidyNote(view: EditorView): boolean {
  const before = view.state.doc.toString();
  const after = tidyNote(before);
  if (after === before) return false;
  // Only the stretch that changed is replaced, so the caret and scroll stay put.
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let endBefore = before.length;
  let endAfter = after.length;
  while (endBefore > start && endAfter > start && before[endBefore - 1] === after[endAfter - 1]) {
    endBefore--;
    endAfter--;
  }
  view.dispatch({
    changes: { from: start, to: endBefore, insert: after.slice(start, endAfter) },
    userEvent: "input.tidy",
  });
  return true;
}
