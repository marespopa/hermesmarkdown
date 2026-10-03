import { useEffect } from "react";
import { useAtom } from "jotai";
import { EditorView } from "@codemirror/view";
import { atom_pendingScrollTarget } from "@/app/atoms/atoms";

// When something asks to open a note at a line (Tasks page, palette `/`
// note-text results), scroll that line into view in this pane, place the
// caret there (at `column` when given, clamped to the line), and briefly
// flash it — then clear the request.
export function useScrollToPendingTarget(editorView: EditorView | null, filePath: string) {
  const [pendingScrollTarget, setPendingScrollTarget] = useAtom(atom_pendingScrollTarget);

  useEffect(() => {
    if (!editorView || !pendingScrollTarget || pendingScrollTarget.path !== filePath) return;

    const lineNumber = Math.min(
      Math.max(1, pendingScrollTarget.line),
      editorView.state.doc.lines,
    );
    const line = editorView.state.doc.line(lineNumber);
    const anchor = line.from + Math.min(Math.max(0, pendingScrollTarget.column ?? 0), line.length);
    editorView.dispatch({
      selection: { anchor },
      effects: EditorView.scrollIntoView(anchor, { y: "center" }),
    });
    editorView.focus();
    requestAnimationFrame(() => {
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
      const node = editorView.domAtPos(line.from).node;
      const lineElement = (node instanceof HTMLElement ? node : node.parentElement)?.closest(".cm-line");
      lineElement?.animate?.(
        [
          { backgroundColor: "rgba(107, 142, 35, 0.24)" },
          { backgroundColor: "rgba(107, 142, 35, 0)" },
        ],
        { duration: 1400, easing: "ease-out" },
      );
    });
    setPendingScrollTarget(null);
  }, [editorView, filePath, pendingScrollTarget, setPendingScrollTarget]);
}
