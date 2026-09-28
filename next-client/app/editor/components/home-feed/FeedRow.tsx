"use client";

import React, { forwardRef } from "react";
import Button from "@/app/components/Button";
import type { FeedEntry } from "./feed-model";

interface FeedRowProps {
  entry: FeedEntry;
  isSelected: boolean;
  onOpen: () => void;
  onHover: () => void;
}

// One note in the feed: day label in the left gutter, then the title and a
// few lines of plain-text preview.
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
        aria-label={entry.title}
        className={`block w-full min-w-0 rounded-lg px-3 py-3 text-left transition-colors ${
          isSelected ? "bg-surface-raised" : "hover:bg-surface-raised"
        }`}
      >
        <span className="block truncate text-ui-body font-medium text-fg">{entry.title}</span>
        {entry.isIndexed ? (
          entry.preview && (
            <span className="mt-1 line-clamp-3 block text-ui-subhead leading-relaxed text-fg-muted">{entry.preview}</span>
          )
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
