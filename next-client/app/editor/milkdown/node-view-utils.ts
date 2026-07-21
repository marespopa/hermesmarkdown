import type { EditorView } from "@milkdown/kit/prose/view";

// NodeView.update() doesn't receive selection info directly, but "is this
// node currently under the ProseMirror selection" is exactly what
// render-vs-edit NodeViews (mermaid diagrams, math formulas) need to
// decide on every update — re-derived from view.state.selection each time
// instead of tracked independently, so it can never drift from the real
// selection.
export function isSelectionInside(view: EditorView, pos: number, nodeSize: number): boolean {
  const { from, to } = view.state.selection;
  return from >= pos && to <= pos + nodeSize;
}
