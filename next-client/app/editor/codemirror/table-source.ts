import { EditorSelection, EditorState, StateEffect, StateField } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

// "Edit as Markdown": shows one table's pipe source as plain text, so a
// table that parsed wrong — a line typed under it absorbed as a row, a
// missing pipe, a stray separator — can be fixed by hand. The source stays
// visible while the caret is anywhere in that block of lines (even if an
// edit stops it parsing as a table for a moment) and turns back into the
// grid once the caret leaves.

export const showTableSource = StateEffect.define<number>();

// The contiguous run of non-blank lines around `pos`: the table plus any
// lines glued to it, which is what a broken table usually looks like.
export function sourceBlockAt(state: EditorState, pos: number): { from: number; to: number } {
  const doc = state.doc;
  let first = doc.lineAt(Math.min(pos, doc.length));
  let last = first;
  while (first.number > 1 && doc.line(first.number - 1).text.trim()) first = doc.line(first.number - 1);
  while (last.number < doc.lines && doc.line(last.number + 1).text.trim()) last = doc.line(last.number + 1);
  return { from: first.from, to: last.to };
}

// Doc position inside the table shown as source, or null.
export const tableSourceField = StateField.define<number | null>({
  create: () => null,
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(showTableSource)) return effect.value;
    }
    if (value === null) return null;
    const pos = transaction.changes.mapPos(value);
    const block = sourceBlockAt(transaction.state, pos);
    const head = transaction.state.selection.main.head;
    return head >= block.from && head <= block.to ? pos : null;
  },
});

// The range kept out of the grid, if any.
export function tableSourceBlock(state: EditorState): { from: number; to: number } | null {
  const pos = state.field(tableSourceField, false);
  return pos == null ? null : sourceBlockAt(state, pos);
}

// Shows the table at `tableFrom` as source with the caret at `caret`.
export function editTableSource(view: EditorView, tableFrom: number, caret: number) {
  view.dispatch({
    effects: showTableSource.of(tableFrom),
    selection: EditorSelection.cursor(caret),
    scrollIntoView: true,
  });
  view.focus();
}
