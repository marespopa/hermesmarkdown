import type { EditorView } from "@codemirror/view";

// The view's visible ranges widened to whole lines and merged, so a
// line-local matcher (a regex that never crosses a newline) can run on just
// the text on screen instead of the whole note on every update.
export function visibleLineRanges(view: EditorView): { from: number; to: number }[] {
  const doc = view.state.doc;
  const merged: { from: number; to: number }[] = [];
  for (const range of view.visibleRanges) {
    const from = doc.lineAt(range.from).from;
    const to = doc.lineAt(range.to).to;
    const last = merged[merged.length - 1];
    if (last && from <= last.to + 1) last.to = Math.max(last.to, to);
    else merged.push({ from, to });
  }
  return merged;
}

// Runs `collect` over each visible stretch of whole lines and shifts its
// matches back to document positions. Only for matchers whose matches stay
// within a line; ones that need context from earlier lines (frontmatter,
// code fences) still read the whole document.
export function collectInVisibleLines<T extends { from: number; to: number }>(
  view: EditorView,
  collect: (text: string) => T[],
): T[] {
  const matches: T[] = [];
  for (const { from, to } of visibleLineRanges(view)) {
    for (const match of collect(view.state.doc.sliceString(from, to))) {
      matches.push({ ...match, from: match.from + from, to: match.to + from });
    }
  }
  return matches;
}
