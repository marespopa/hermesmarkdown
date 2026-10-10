import type { EditorView } from "@codemirror/view";
import type { RenderedBlockMatch } from "../codemirror/rendered-block";

// The Mermaid, image, rendered-block source and token cost dialogs listen
// for these document events, so any editor pane (a pill button, double-click
// or Ctrl/Cmd+Shift+Enter), menu or command can open them.
export function openMermaidDialog(source: string) {
  const theme = document.documentElement.classList.contains("dark") ? "dark" : "default";
  document.dispatchEvent(new CustomEvent("hermes:open-mermaid-dialog", {
    detail: { source, theme },
    bubbles: true,
  }));
}

export interface RenderedBlockSourceRequest {
  view: EditorView;
  match: RenderedBlockMatch;
}

// Opens the source editor for a rendered Mermaid / math block.
export function openRenderedBlockSource(view: EditorView, match: RenderedBlockMatch) {
  document.dispatchEvent(new CustomEvent<RenderedBlockSourceRequest>("hermes:open-rendered-block-source", {
    detail: { view, match },
  }));
}

export function openImageDialog(src: string, alt: string) {
  document.dispatchEvent(new CustomEvent("hermes:open-image-dialog", {
    detail: { src, alt },
    bubbles: true,
  }));
}

export const TOKEN_COST_EVENT = "hermes:open-token-cost";

// Prices the note in the focused pane.
export function openTokenCostDialog() {
  document.dispatchEvent(new CustomEvent(TOKEN_COST_EVENT));
}
