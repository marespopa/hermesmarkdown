import { syntaxTree } from "@codemirror/language";
import { EditorSelection, EditorState, type Line, type SelectionRange, type Transaction } from "@codemirror/state";
import { listMarker } from "./live-markers";

// A bullet's or task's marker is drawn as a widget (live-markers.ts), so a
// caret before it would sit in front of the • and typing there breaks the
// list. As in Notion or Obsidian, a caret that lands in the marker (a click
// or tap, Home, Up/Down, Right from the line above) moves to where the text
// starts; Left from there goes on to the end of the line above. Selections
// are left alone, and so are ordered markers, which stay as text.

interface MarkerSpan {
  /** Where a caret stops counting as "before the text": the line start, or the marker's start after a quote's `>`. */
  from: number;
  /** Where the item's text starts. */
  to: number;
}

function drawnMarkerOn(state: EditorState, line: Line): MarkerSpan | null {
  let span: MarkerSpan | null = null;
  syntaxTree(state).iterate({
    from: line.from,
    to: line.to,
    enter(ref) {
      if (span) return false;
      if (ref.name !== "ListMark" || ref.from < line.from) return;
      const marker = listMarker(state, ref.node);
      if (!marker || marker.kind === "ordered") return false;
      const leading = state.doc.sliceString(line.from, ref.from);
      span = { from: /^[ \t]*$/.test(leading) ? line.from : ref.from, to: marker.to };
      return false;
    },
  });
  return span;
}

// Left (one step back) from the start of the item's text.
function leavesLeft(tr: Transaction, index: number, head: number, span: MarkerSpan): boolean {
  if (!tr.isUserEvent("select") || tr.isUserEvent("select.pointer") || span.from === 0) return false;
  const before = tr.startState.selection.ranges[index];
  return !!before && tr.changes.mapPos(before.head) === span.to && head === span.to - 1;
}

function guard(tr: Transaction, range: SelectionRange, index: number): SelectionRange {
  if (!range.empty) return range;
  const span = drawnMarkerOn(tr.state, tr.state.doc.lineAt(range.head));
  if (!span || range.head < span.from || range.head >= span.to) return range;
  return EditorSelection.cursor(leavesLeft(tr, index, range.head, span) ? span.from - 1 : span.to);
}

export const listCaretGuard = EditorState.transactionFilter.of((tr) => {
  if (!tr.selection) return tr;
  const ranges = tr.selection.ranges.map((range, index) => guard(tr, range, index));
  if (ranges.every((range, index) => range.head === tr.selection!.ranges[index].head)) return tr;
  return [tr, { selection: EditorSelection.create(ranges, tr.selection.mainIndex), sequential: true }];
});
