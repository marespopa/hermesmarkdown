import React from "react";
import { HiOutlineSparkles } from "react-icons/hi";
import DialogModal from "../../components/DialogModal/DialogModal";
import Button from "../../components/Button";
import { diffWords } from "@/app/utils/text-diff";
import type { AIReviewState } from "../hooks/useAIEditorActions";

interface AIReviewDialogProps {
  review: AIReviewState | null;
  onClose: () => void;
  onReplace: () => void;
  onInsertBelow: () => void;
}

export const AIReviewDialog: React.FC<AIReviewDialogProps> = ({
  review,
  onClose,
  onReplace,
  onInsertBelow,
}) => {
  const tokens = review ? diffWords(review.original, review.suggestion) : [];

  return (
    <DialogModal
      isOpened={!!review}
      onClose={onClose}
      styles="max-w-2xl lg:max-w-4xl xl:max-w-6xl"
      ariaLabelledBy="ai-review-title"
    >
      <div className="flex items-center gap-2 mb-4">
        <HiOutlineSparkles className="text-sage" size={18} />
        <h2 id="ai-review-title" className="text-ui-headline font-semibold text-ink-light dark:text-ink-dark">
          {review?.label ?? "AI suggestion"}
        </h2>
      </div>

      <div className="rounded-2xl border border-beige dark:border-clay bg-paper-light dark:bg-paper-dark-surface p-4 max-h-[60vh] lg:max-h-[65vh] overflow-y-auto whitespace-pre-wrap font-mono text-ui-footnote leading-relaxed">
        {tokens.map((token, idx) => {
          if (token.type === "removed") {
            return (
              <span
                key={idx}
                className="line-through text-red-500/80 dark:text-red-400/70 bg-red-500/10 dark:bg-red-400/10 rounded px-0.5"
              >
                {token.value}
              </span>
            );
          }
          if (token.type === "added") {
            return (
              <span
                key={idx}
                className="text-sage bg-sage/10 rounded px-0.5"
              >
                {token.value}
              </span>
            );
          }
          return <span key={idx}>{token.value}</span>;
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mt-6 sm:justify-end">
        <Button variant="outlined" onClick={onClose} className="sm:flex-1 lg:flex-none lg:w-32">
          Cancel
        </Button>
        <Button variant="secondary" onClick={onInsertBelow} className="sm:flex-1 lg:flex-none lg:w-40">
          Insert Below
        </Button>
        <Button variant="primary" onClick={onReplace} className="sm:flex-1 lg:flex-none lg:w-44">
          Replace Selection
        </Button>
      </div>
    </DialogModal>
  );
};
