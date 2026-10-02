"use client";

import React, { forwardRef } from "react";
import Button from "@/app/components/Button";
import SensitiveBadge from "@/app/components/SensitiveBadge";
import type { FeedEntry } from "./feed-model";

interface FeedRowProps {
  entry: FeedEntry;
  isSelected: boolean;
  onOpen: () => void;
  onHover: () => void;
}

const PREVIEW_CLASS = "mt-1 line-clamp-3 block text-ui-subhead leading-relaxed text-fg-muted";

// The preview under the title. A sensitive note's preview is either masked
// bullets (the real text never reaches the DOM) or blurred until the row is
// hovered or keyboard-focused. Selection doesn't unblur: row 0 starts selected.
function FeedPreview({ entry }: { entry: FeedEntry }) {
  if (!entry.preview) return null;
  if (entry.previewStyle === "masked") {
    return (
      <>
        <span aria-hidden="true" className={PREVIEW_CLASS}>{entry.preview}</span>
        <span className="sr-only">Preview hidden</span>
      </>
    );
  }
  if (entry.previewStyle === "blurred") {
    return (
      <>
        <span
          aria-hidden="true"
          className={`${PREVIEW_CLASS} select-none blur-sm motion-safe:transition group-hover:blur-none group-focus-visible:blur-none`}
        >
          {entry.preview}
        </span>
        <span className="sr-only">Preview blurred</span>
      </>
    );
  }
  return <span className={PREVIEW_CLASS}>{entry.preview}</span>;
}

// One note in the feed: day label in the left gutter, then the title and a
// few lines of plain-text preview (masked or blurred for sensitive notes).
const FeedRow = forwardRef<HTMLDivElement, FeedRowProps>(function FeedRow(
  { entry, isSelected, onOpen, onHover },
  ref,
) {
  return (
    <div ref={ref} role="option" aria-selected={isSelected} className="grid grid-cols-[4.5rem_1fr] gap-3 sm:grid-cols-[5rem_1fr]">
      <span className="pt-4 text-right text-ui-footnote text-fg-muted">{entry.dayLabel}</span>
      <Button
        variant="unstyled"
        onClick={onOpen}
        onMouseEnter={onHover}
        aria-label={entry.isSensitive ? `${entry.title} (sensitive)` : entry.title}
        className={`group block w-full min-w-0 rounded-lg px-3 py-3 text-left transition-colors ${
          isSelected ? "bg-surface-raised" : "hover:bg-surface-raised"
        }`}
      >
        <span className="flex items-center gap-1.5">
          <span className="block truncate text-ui-body font-medium text-fg">{entry.title}</span>
          {entry.isSensitive && <SensitiveBadge />}
        </span>
        {entry.isIndexed ? (
          <FeedPreview entry={entry} />
        ) : (
          // Placeholder until the indexer has read this note.
          <span aria-hidden="true" className="mt-2 block space-y-2 motion-safe:animate-pulse">
            <span className="block h-2.5 w-11/12 rounded bg-surface-raised" />
            <span className="block h-2.5 w-2/3 rounded bg-surface-raised" />
          </span>
        )}
      </Button>
    </div>
  );
});

export default FeedRow;
