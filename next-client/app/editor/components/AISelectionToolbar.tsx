import React, { useEffect, useState, useRef } from "react";
import getCaretCoordinates from "textarea-caret";
import { HiOutlineLightningBolt, HiOutlinePlus, HiOutlineRefresh } from "react-icons/hi";
import { PILL_CONTAINER_CLASSES } from "./constants";

interface AISelectionToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  isAiLoading: boolean;
  onImprove: () => void;
  onExpand: () => void;
}

export const AISelectionToolbar: React.FC<AISelectionToolbarProps> = ({
  textareaRef,
  isAiLoading,
  onImprove,
  onExpand,
}) => {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [hasSelection, setHasSelection] = useState(false);
  const checkSelectionRef = useRef<number | null>(null);

  useEffect(() => {
    const checkSelection = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (start !== end && end - start > 0) {
        // Only show if selection is not just whitespace
        const selectedText = textarea.value.substring(start, end).trim();
        if (selectedText) {
          setHasSelection(true);
          // Position at the end of the selection
          const caret = getCaretCoordinates(textarea, end);
          setPos({
            top: caret.top - 36, // Position above
            left: Math.min(caret.left, textarea.clientWidth - 160),
          });
          return;
        }
      }
      setHasSelection(false);
      setPos(null);
    };

    const handleInteraction = () => {
      if (checkSelectionRef.current) window.cancelAnimationFrame(checkSelectionRef.current);
      checkSelectionRef.current = window.requestAnimationFrame(checkSelection);
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Don't hide if clicking inside the toolbar itself
      if ((e.target as HTMLElement).closest(".ai-selection-toolbar")) return;
      setHasSelection(false);
      setPos(null);
    };

    // Use window listeners to catch interactions that end outside the textarea
    window.addEventListener("mouseup", handleInteraction);
    window.addEventListener("keyup", handleInteraction);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("resize", handleInteraction);

    // Also listen to scroll on the textarea itself (if it exists yet)
    // or via capture on window if we want to be really robust
    const handleScroll = (e: Event) => {
      if (e.target === textareaRef.current) {
        checkSelection();
      }
    };
    window.addEventListener("scroll", handleScroll, true);

    // Initial check just in case
    checkSelection();

    return () => {
      window.removeEventListener("mouseup", handleInteraction);
      window.removeEventListener("keyup", handleInteraction);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("resize", handleInteraction);
      window.removeEventListener("scroll", handleScroll, true);
      if (checkSelectionRef.current) window.cancelAnimationFrame(checkSelectionRef.current);
    };
  }, [textareaRef]);

  if (!hasSelection || !pos) return null;

  return (
    <div
      className={`${PILL_CONTAINER_CLASSES} ai-selection-toolbar !z-[100] p-0.5 overflow-hidden animate-in fade-in zoom-in duration-200 shadow-xl border-zinc-200 dark:border-zinc-700`}
      style={{
        top: Math.max(8, pos.top),
        left: Math.max(8, pos.left),
      }}
    >
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onImprove();
        }}
        disabled={isAiLoading}
        className="flex items-center gap-1.5 px-2 py-1 text-ui-footnote font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded transition-colors disabled:opacity-50"
      >
        {isAiLoading ? (
          <HiOutlineRefresh className="animate-spin" size={12} />
        ) : (
          <HiOutlineLightningBolt size={12} />
        )}
        Improve
      </button>
      <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-800 my-auto mx-0.5" />
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onExpand();
        }}
        disabled={isAiLoading}
        className="flex items-center gap-1.5 px-2 py-1 text-ui-footnote font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded transition-colors disabled:opacity-50"
      >
        <HiOutlinePlus size={12} />
        Expand
      </button>
    </div>
  );
};
