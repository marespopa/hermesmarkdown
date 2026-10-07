"use client";

import React, { useState } from "react";
import Button from "@/app/components/Button";
import type { FeedTag } from "./feed-model";

// How many of the most used tags show before "+N".
export const FEED_TAG_LIMIT = 8;

interface FeedTagsProps {
  /** Every tag in the feed, most used first (`feedTags`). */
  tags: FeedTag[];
  /** Tags the feed is filtered by; a note must carry all of them. */
  selected: readonly string[];
  onChange: (tags: string[]) => void;
}

const CHIP_CLASS = "rounded-full border px-2.5 py-0.5 text-ui-footnote transition-colors";
const IDLE_CLASS = "border-edge text-fg-muted hover:border-accent/60 hover:text-fg";
const ON_CLASS = "border-accent bg-accent text-white hover:bg-accent-hover dark:text-surface";

// One row of tag chips under the header: the most used tags, "+N" for the
// rest, and Clear while a filter is on. Selected tags always show, even past
// the limit. Hidden when the feed has no tags.
export default function FeedTags({ tags, selected, onChange }: FeedTagsProps) {
  const [showAll, setShowAll] = useState(false);
  if (tags.length === 0 && selected.length === 0) return null;

  const top = showAll ? tags : tags.slice(0, FEED_TAG_LIMIT);
  // A selected tag no note carries any more still shows, so it can be cleared.
  const extra = selected.filter((tag) => !top.some((entry) => entry.tag === tag));
  const shown = [...top, ...extra.map((tag) => tags.find((entry) => entry.tag === tag) ?? { tag, count: 0 })];
  const hidden = tags.filter((entry) => !shown.includes(entry)).length;

  const toggle = (tag: string) =>
    onChange(selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag]);

  return (
    <div role="group" aria-label="Filter by tag" className="-mt-4 mb-6 flex flex-wrap items-center gap-1.5">
      {shown.map(({ tag, count }) => {
        const isOn = selected.includes(tag);
        return (
          <Button
            key={tag}
            variant="unstyled"
            aria-pressed={isOn}
            aria-label={`#${tag}, ${count} ${count === 1 ? "note" : "notes"}`}
            onClick={() => toggle(tag)}
            className={`${CHIP_CLASS} ${isOn ? ON_CLASS : IDLE_CLASS}`}
          >
            #{tag}
          </Button>
        );
      })}
      {tags.length > FEED_TAG_LIMIT && (showAll || hidden > 0) && (
        <Button
          variant="unstyled"
          aria-expanded={showAll}
          onClick={() => setShowAll((value) => !value)}
          className={`${CHIP_CLASS} border-transparent text-fg-muted hover:text-fg`}
        >
          {showAll ? "Fewer" : `+${hidden}`}
        </Button>
      )}
      {selected.length > 0 && (
        <Button
          variant="unstyled"
          onClick={() => onChange([])}
          className={`${CHIP_CLASS} border-transparent text-fg-muted hover:text-fg`}
        >
          × Clear
        </Button>
      )}
    </div>
  );
}
