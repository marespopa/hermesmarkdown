import type { EditorView } from "@codemirror/view";

// Briefly tints the editor line holding `pos` and fades it out, so the eye
// finds where a jump landed. Waits a frame for the scroll to draw the line;
// skipped when motion is reduced.
export function flashLine(view: EditorView, pos: number) {
  requestAnimationFrame(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const node = view.domAtPos(pos).node;
    const lineElement = (node instanceof HTMLElement ? node : node.parentElement)?.closest(".cm-line");
    lineElement?.animate?.(
      [
        { backgroundColor: "rgba(107, 142, 35, 0.24)" },
        { backgroundColor: "rgba(107, 142, 35, 0)" },
      ],
      { duration: 1400, easing: "ease-out" },
    );
  });
}
