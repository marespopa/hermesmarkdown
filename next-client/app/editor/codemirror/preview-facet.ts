import { EditorState, Facet } from "@codemirror/state";
import type { ViewUpdate } from "@codemirror/view";

// True while the editor shows the read-only Preview reading view
// (preview-mode.ts). Lives in its own module so display plugins can ask
// "am I in preview?" without importing the preview extension itself.
export const previewModeFacet = Facet.define<boolean, boolean>({
  combine: (values) => values.some(Boolean),
});

export function isPreviewMode(state: EditorState): boolean {
  return state.facet(previewModeFacet);
}

// Display plugins that only rebuild on doc/selection changes also need to
// rebuild when the mode flips.
export function previewModeChanged(update: ViewUpdate): boolean {
  return isPreviewMode(update.startState) !== isPreviewMode(update.state);
}
