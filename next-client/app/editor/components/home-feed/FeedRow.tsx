"use client";

import React, { forwardRef, useState } from "react";
import { HiOutlineDocumentText } from "react-icons/hi";
import { TbPinned, TbPinnedFilled } from "react-icons/tb";
import Button from "@/app/components/Button";
import PrivateBadge from "@/app/components/PrivateBadge";
import TabContextMenu from "../TabContextMenu";
import type { FeedEntry } from "./feed-model";
import { FeedPreviewSkeleton } from "./FeedSkeleton";
import { useLongPress } from "./use-long-press";

interface FeedRowProps {
  entry: FeedEntry;
  isSelected: boolean;
  onOpen: () => void;
  onHover: () => void;
  /** Pins the note to the top of the feed, or unpins it. */
  onTogglePin: () => void;
}

const PREVIEW_CLASS = "mt-1 line-clamp-3 block text-ui-subhead leading-relaxed text-fg-muted";

// The preview under the title. A private note's preview is masked bullets:
// the real text never reaches the DOM.
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
  return <span className={PREVIEW_CLASS}>{entry.preview}</span>;
}

// One note in the feed: day label (or "Pinned") in the left gutter, then the
// title, a few lines of plain-text preview (masked for private
// notes) and the file name in small, faint type. The pin button is a
// 44px target at the row's top right, kept clear of the row's text so a tap
// that just misses it doesn't open the note. It shows on hover, keyboard
// focus or selection, always on a pinned note, and always on touch-only
// screens (`any-hover: none`: `hover: none` only reads the primary pointer,
// so a mouse on a tablet still gets the hover behaviour). A long press,
// right-click or the context-menu key opens the row's menu (Open, Pin /
// Unpin).
const FeedRow = forwardRef<HTMLDivElement, FeedRowProps>(function FeedRow(
  { entry, isSelected, onOpen, onHover, onTogglePin },
  ref,
) {
  const pinLabel = entry.isPinned ? "Unpin from Home" : "Pin to Home";
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  // Just below the finger, so lifting it doesn't land on the first item.
  const longPress = useLongPress(({ x, y }) => setMenu({ x, y: y + 12 }));

  const handleContextMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (longPress.didFire()) return; // Android follows a hold with this event.
    // The context-menu key reports no pointer: anchor under the row's title.
    const rect = event.currentTarget.getBoundingClientRect();
    const fromKeyboard = event.clientX === 0 && event.clientY === 0;
    setMenu(fromKeyboard ? { x: rect.left + 12, y: rect.top + 32 } : { x: event.clientX, y: event.clientY });
  };

  return (
    <div
      ref={ref}
      role="option"
      aria-selected={isSelected}
      className="group/row relative grid grid-cols-[4.5rem_1fr] gap-3 sm:grid-cols-[5rem_1fr]"
    >
      <span className="pt-4 text-right text-ui-footnote text-fg-muted">{entry.dayLabel}</span>
      <Button
        variant="unstyled"
        onClick={() => { if (!longPress.shouldSkipClick()) onOpen(); }}
        onMouseEnter={onHover}
        onContextMenu={handleContextMenu}
        {...longPress.handlers}
        aria-label={entry.isPrivate ? `${entry.title} (private)` : entry.title}
        // No text selection or callout on a long press (iOS).
        className={`group block w-full min-w-0 select-none rounded-lg py-3 pl-3 pr-12 text-left transition-colors [-webkit-touch-callout:none] ${
          isSelected ? "bg-surface-raised" : "hover:bg-surface-raised"
        }`}
      >
        <span className="flex items-center gap-1.5">
          <span className="block truncate text-ui-body font-medium text-fg">{entry.title}</span>
          {entry.isPrivate && <PrivateBadge />}
        </span>
        {entry.isIndexed ? (
          <FeedPreview entry={entry} />
        ) : (
          // Placeholder until the indexer has read this note.
          <FeedPreviewSkeleton />
        )}
        {entry.fileName && (
          <span className="mt-1.5 block truncate text-ui-caption text-fg-faint">{entry.fileName}</span>
        )}
      </Button>
      <Button
        variant="unstyled"
        onClick={onTogglePin}
        onMouseEnter={onHover}
        aria-label={pinLabel}
        title={pinLabel}
        className={`absolute right-0.5 top-1 flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-surface hover:text-fg focus-visible:opacity-100 group-hover/row:opacity-100 [@media(any-hover:none)]:opacity-100 ${
          entry.isPinned ? "text-accent" : "text-fg-faint"
        } ${isSelected || entry.isPinned ? "opacity-100" : "opacity-0"}`}
      >
        {entry.isPinned ? <TbPinnedFilled size={17} aria-hidden="true" /> : <TbPinned size={17} aria-hidden="true" />}
      </Button>
      {menu && (
        <TabContextMenu
          x={menu.x}
          y={menu.y}
          label={entry.title}
          onClose={() => setMenu(null)}
          items={[
            { label: "Open", icon: <HiOutlineDocumentText size={15} />, onClick: onOpen },
            {
              label: pinLabel,
              icon: entry.isPinned ? <TbPinnedFilled size={15} /> : <TbPinned size={15} />,
              onClick: onTogglePin,
            },
          ]}
        />
      )}
    </div>
  );
});

export default FeedRow;
