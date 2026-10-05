"use client";

import React, { forwardRef } from "react";
import { HiOutlineDocument } from "react-icons/hi";
import Button from "@/app/components/Button";
import SensitiveBadge from "@/app/components/SensitiveBadge";
import type { FeedEntry } from "./feed-model";

interface FeedRowProps {
  entry: FeedEntry;
  isSelected: boolean;
  /** Last note of its day: no separator under it. */
  isLastOfDay: boolean;
  onOpen: () => void;
  onHover: () => void;
}

// The preview after the time, inline so both share the 2-line clamp. A
// sensitive note's preview is either masked bullets (the real text never
// reaches the DOM) or blurred until the row is hovered or keyboard-focused.
// Selection doesn't unblur: row 0 starts selected.
function FeedPreview({ entry }: { entry: FeedEntry }) {
  if (!entry.preview) return null;
  if (entry.previewStyle === "masked") {
    return (
      <>
        <span aria-hidden="true">{entry.preview}</span>
        <span className="sr-only">Preview hidden</span>
      </>
    );
  }
  if (entry.previewStyle === "blurred") {
    return (
      <>
        <span
          aria-hidden="true"
          className="select-none blur-sm motion-safe:transition group-hover:blur-none group-focus-visible:blur-none"
        >
          {entry.preview}
        </span>
        <span className="sr-only">Preview blurred</span>
      </>
    );
  }
  return <span>{entry.preview}</span>;
}

// One note in the feed, laid out like a notes-app list: the day as a bold
// section header over its first note, then the title, the time before a
// 2-line preview (masked or blurred for sensitive notes), and the file name. Hairline separators, inset to the text,
// run between the notes of a day; the selected row is a rounded fill.
const FeedRow = forwardRef<HTMLDivElement, FeedRowProps>(function FeedRow(
  { entry, isSelected, isLastOfDay, onOpen, onHover },
  ref,
) {
  return (
    <div ref={ref}>
      {entry.dayLabel && (
        <div className="px-3 pb-1.5 pt-6 text-ui-subhead font-semibold text-fg">{entry.dayLabel}</div>
      )}
      <div role="option" aria-selected={isSelected}>
        <Button
          variant="unstyled"
          onClick={onOpen}
          onMouseEnter={onHover}
          aria-label={entry.isSensitive ? `${entry.title} (sensitive)` : entry.title}
          className={`group relative block w-full min-w-0 rounded-[10px] px-3 py-2.5 text-left transition-colors ${
            isSelected ? "bg-surface-raised" : "hover:bg-surface-raised"
          } ${
            // The separator hides next to a filled row, as the fill already divides.
            isLastOfDay || isSelected
              ? ""
              : "after:pointer-events-none after:absolute after:inset-x-3 after:bottom-0 after:h-px after:bg-edge-subtle hover:after:hidden"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <span className="block truncate text-ui-callout font-semibold text-fg">{entry.title}</span>
            {entry.isSensitive && <SensitiveBadge />}
          </span>
          {entry.isIndexed ? (
            (entry.timeLabel || entry.preview) && (
              <span className="mt-0.5 line-clamp-2 block text-ui-subhead text-fg-muted">
                {entry.timeLabel && <span className="mr-2 font-medium tabular-nums text-fg">{entry.timeLabel}</span>}
                <FeedPreview entry={entry} />
              </span>
            )
          ) : (
            // Placeholder until the indexer has read this note.
            <span aria-hidden="true" className="mt-2 block motion-safe:animate-pulse">
              <span className="block h-2.5 w-2/3 rounded bg-surface-raised" />
            </span>
          )}
          {entry.fileName && (
            <span className="mt-1 flex min-w-0 items-center gap-1 text-ui-footnote text-fg-faint">
              <HiOutlineDocument aria-hidden="true" className="shrink-0" size={12} />
              <span className="truncate">{entry.fileName}</span>
            </span>
          )}
        </Button>
      </div>
    </div>
  );
});

export default FeedRow;
