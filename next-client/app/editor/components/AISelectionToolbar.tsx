import React, { useEffect, useState, useRef } from "react";
import { HiOutlineLightningBolt, HiOutlinePlus, HiOutlineSparkles } from "react-icons/hi";
import Portal from "../../components/Portal/Portal";

interface AISelectionToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  isAiLoading: boolean;
  onImprove: () => void;
  onExpand: () => void;
  onPrompt: () => void;
}

export const AISelectionToolbar: React.FC<AISelectionToolbarProps> = ({
  textareaRef,
  isAiLoading,
  onImprove,
  onExpand,
  onPrompt,
}) => {
  const [hasSelection, setHasSelection] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const checkSelection = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const { selectionStart: s, selectionEnd: e } = textarea;
      if (s !== e && textarea.value.substring(s, e).trim()) {
        setHasSelection(true);
      } else {
        setHasSelection(false);
      }
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
  }, [textareaRef]);

  if (!hasSelection || isAiLoading) return null;

  return (
    <Portal>
      <div className="fixed top-4 inset-x-0 z-[99] flex justify-center pointer-events-none">
        <div
          className="ai-selection-toolbar pointer-events-auto flex items-center gap-0.5 p-1 bg-paper-light/80 dark:bg-neutral-900/80 backdrop-blur-2xl border border-paper-light/20 dark:border-neutral-800/50 rounded-full animate-in fade-in zoom-in-95 duration-200 select-none"
        >
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPrompt(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-ui-footnote font-medium text-sage dark:text-sage hover:bg-sage/10 dark:hover:bg-sage/10 rounded-full transition-colors"
          >
            <HiOutlineSparkles size={13} />
            Prompt
          </button>
          <div className="w-px h-3.5 bg-beige dark:bg-clay my-auto" />
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onImprove(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-ui-footnote font-medium text-sage dark:text-sage hover:bg-sage/10 dark:hover:bg-sage/10 rounded-full transition-colors"
          >
            <HiOutlineLightningBolt size={13} />
            Improve
          </button>
          <div className="w-px h-3.5 bg-beige dark:bg-clay my-auto" />
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onExpand(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-ui-footnote font-medium text-sage dark:text-sage hover:bg-sage/10 dark:hover:bg-sage/10 rounded-full transition-colors"
          >
            <HiOutlinePlus size={13} />
            Expand
          </button>
        </div>
      </div>
    </Portal>
  );
};
