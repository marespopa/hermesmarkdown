import React, { useEffect, useState, useRef } from "react";
import { useAtomValue } from "jotai";
import { HiOutlineChatAlt2 } from "react-icons/hi";
import Portal from "../../components/Portal/Portal";
import { atom_activeEditorView, atom_activeMilkdownView, atom_activeEditorKind } from "@/app/atoms/ui-atoms";

interface AISelectionToolbarProps {
  isAiLoading: boolean;
  onPrompt: () => void;
}

// Estimated pill size for clamping/centering before the DOM node exists —
// it's a single "Ask AI" button, so this stays a tight, fairly stable guess.
const TOOLBAR_WIDTH = 92;
const TOOLBAR_GAP = 8;

type Pos = { top: number; left: number };

export const AISelectionToolbar: React.FC<AISelectionToolbarProps> = ({
  isAiLoading,
  onPrompt,
}) => {
  const activeEditorView = useAtomValue(atom_activeEditorView);
  const activeMilkdownView = useAtomValue(atom_activeMilkdownView);
  const activeEditorKind = useAtomValue(atom_activeEditorKind);
  const viewRef = useRef(activeEditorView);
  viewRef.current = activeEditorView;
  const milkdownViewRef = useRef(activeMilkdownView);
  milkdownViewRef.current = activeMilkdownView;
  const kindRef = useRef(activeEditorKind);
  kindRef.current = activeEditorKind;
  const [hasSelection, setHasSelection] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const checkSelection = () => {
      // Rendered mode has its own ProseMirror view (registered separately
      // from CM6's, see atom_activeMilkdownView) — without this branch the
      // toolbar could only ever see a CM6 selection and never appeared at
      // all when selecting text in Preview mode.
      let selected: boolean;
      if (kindRef.current === "milkdown") {
        const view = milkdownViewRef.current;
        if (!view || !view.hasFocus()) {
          setHasSelection(false);
          return;
        }
        const { from, to } = view.state.selection;
        selected = from !== to && !!view.state.doc.textBetween(from, to, "\n").trim();
      } else {
        const view = viewRef.current;
        if (!view || !view.hasFocus) {
          setHasSelection(false);
          return;
        }
        const { from, to } = view.state.selection.main;
        selected = from !== to && !!view.state.sliceDoc(from, to).trim();
      }

      setHasSelection(selected);
      if (!selected) return;

      // Both editors are contenteditable surfaces backed by the native
      // browser Selection API, so the same DOM range works for anchoring
      // the toolbar regardless of which one is active — no per-editor
      // coordinate lookup needed.
      const domSelection = window.getSelection();
      const range = domSelection && domSelection.rangeCount > 0 ? domSelection.getRangeAt(0) : null;
      const rect = range?.getBoundingClientRect();
      if (!rect || (!rect.width && !rect.height)) return;

      setPos({
        top: Math.max(TOOLBAR_GAP, rect.top - 44),
        left: Math.min(
          Math.max(TOOLBAR_GAP, rect.left + rect.width / 2 - TOOLBAR_WIDTH / 2),
          window.innerWidth - TOOLBAR_WIDTH - TOOLBAR_GAP,
        ),
      });
    };

    const schedule = () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = window.requestAnimationFrame(checkSelection);
    };

    const handleMouseDown = (ev: MouseEvent) => {
      if ((ev.target as HTMLElement).closest(".ai-selection-toolbar")) return;
      setHasSelection(false);
    };

    window.addEventListener("mouseup", schedule);
    window.addEventListener("keyup", schedule);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("resize", schedule);
    document.addEventListener("selectionchange", schedule);

    checkSelection();

    return () => {
      window.removeEventListener("mouseup", schedule);
      window.removeEventListener("keyup", schedule);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("selectionchange", schedule);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!hasSelection || isAiLoading || !pos) return null;

  return (
    <Portal>
      <div className="fixed z-[99] pointer-events-none" style={{ top: pos.top, left: pos.left }}>
        <div
          className="ai-selection-toolbar pointer-events-auto flex items-center gap-0.5 p-1 bg-paper-light/80 dark:bg-neutral-900/80 backdrop-blur-2xl border border-paper-light/20 dark:border-neutral-800/50 rounded-full animate-in fade-in zoom-in-95 duration-200 select-none"
        >
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPrompt(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-ui-footnote font-medium text-sage dark:text-sage hover:bg-sage/10 dark:hover:bg-sage/10 rounded-full transition-colors"
          >
            <HiOutlineChatAlt2 size={13} />
            Ask AI
          </button>
        </div>
      </div>
    </Portal>
  );
};
