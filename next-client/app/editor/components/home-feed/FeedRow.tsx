"use client";

import React, { forwardRef, useState } from "react";
import { HiOutlineDocumentText } from "react-icons/hi";
import { TbPinned, TbPinnedFilled } from "react-icons/tb";
import Button from "@/app/components/Button";
import SensitiveBadge from "@/app/components/SensitiveBadge";
import TabContextMenu from "../TabContextMenu";
import type { FeedEntry } from "./feed-model";
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

// One note in the feed: day label (or "Pinned") in the left gutter, then the
// title, a few lines of plain-text preview (masked or blurred for sensitive
// notes) and the file name in small, faint type. The pin button shows on
// hover, keyboard focus or selection, and not at all on touch-only screens,
// where a long press opens the row's menu (Open, Pin / Unpin) instead; a
// right-click or the context-menu key opens it everywhere. "Touch-only" is
// `any-hover: none`: `hover: none` only reads the primary pointer, so it
// also hid the pin from a mouse on a tablet or phone.
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
        aria-label={entry.isSensitive ? `${entry.title} (sensitive)` : entry.title}
        // No text selection or callout on a long press (iOS).
        className={`group block w-full min-w-0 select-none rounded-lg py-3 pl-3 pr-10 text-left [@media(any-hover:none)]:pr-3 transition-colors [-webkit-touch-callout:none] ${
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
        className={`absolute right-1.5 top-2 flex h-8 w-8 items-center justify-center rounded-md text-fg-faint transition-opacity hover:text-fg focus-visible:opacity-100 group-hover/row:opacity-100 [@media(any-hover:none)]:hidden ${
          isSelected ? "opacity-100" : "opacity-0"
        }`}
      >
        {entry.isPinned ? <TbPinnedFilled size={15} aria-hidden="true" /> : <TbPinned size={15} aria-hidden="true" />}
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
