"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { useVirtualizer } from "@tanstack/react-virtual";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_noteDisplayItems } from "@/app/atoms/privacy-atoms";
import { atom_homeFeedTopRequest, atom_indexerState, atom_userName } from "@/app/atoms/ui-atoms";
import { atom_templatesFolder } from "@/app/atoms/template-atoms";
import Button from "@/app/components/Button";
import FeedBar from "./home-feed/FeedBar";
import FeedHeader from "./home-feed/FeedHeader";
import FeedRow from "./home-feed/FeedRow";
import FeedSkeleton from "./home-feed/FeedSkeleton";
import FeedStart from "./home-feed/FeedStart";
import FeedVault from "./home-feed/FeedVault";
import FeedStatus from "./home-feed/FeedStatus";
import WeekStrip from "./home-feed/WeekStrip";
import { buildFeed, buildWeek } from "./home-feed/feed-model";

// Above this many notes only the rows in view (plus overscan) are rendered,
// however far you scroll. Smaller vaults render every row.
const VIRTUALIZE_THRESHOLD = 100;

interface HomeFeedProps {
  /** Opens a note by vault path (and should close the feed). */
  onOpenNote: (path: string) => void;
  onNewNote: () => void;
  /** Opens the command palette, optionally prefilled. */
  onSearch: (initialQuery?: string) => void;
  /** Leaves the feed for the workspace (Escape). */
  onClose: () => void;
  /** Whether the command palette is open (the search pill hands its place to the palette field). */
  isSearchOpen?: boolean;
  /** False with no vault open: the feed shows vault actions and ways to start writing instead of notes. */
  hasVault?: boolean;
  /** Opens a file from the device into the draft (the no-vault "Open File…"). */
  onOpenFile?: () => void;
}

function isTypingTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  return !!element?.closest?.("input, textarea, select, [contenteditable='true'], .cm-editor, [role='dialog']");
}

// Local midnight of a row's day, for the week strip's highlight.
function activeDay(modifiedAt: number | undefined) {
  if (!modifiedAt) return null;
  const date = new Date(modifiedAt);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

// The vault's home screen: recent notes, newest first, in the editor's
// column. Keyboard: j/k or arrows move, Enter opens, Escape leaves; any
// other printable key opens the command palette with that key typed.
export default function HomeFeed({ onOpenNote, onNewNote, onSearch, onClose, isSearchOpen = false, hasVault = true, onOpenFile }: HomeFeedProps) {
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const indexerState = useAtomValue(atom_indexerState);
  const userName = useAtomValue(atom_userName);
  const isIndexing = indexerState !== "idle";
  const displayItems = useAtomValue(atom_noteDisplayItems);
  const templatesFolder = useAtomValue(atom_templatesFolder).folder;
  const now = useMemo(() => new Date(), [fileMetadata, displayItems]); // eslint-disable-line react-hooks/exhaustive-deps
  const feed = useMemo(
    () => buildFeed(fileMetadata, displayItems, now, templatesFolder),
    [fileMetadata, displayItems, now, templatesFolder],
  );
  const week = useMemo(() => buildWeek(feed, now), [feed, now]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const shouldVirtualize = feed.length > VIRTUALIZE_THRESHOLD;

  // Rows vary in height (previews wrap to 1–3 lines), so each reports its
  // real height via `measureElement`. The header scrolls with the list,
  // hence the scroll margin (the scroll container is `relative`, so the
  // list's offsetTop is measured from it).
  const rowVirtualizer = useVirtualizer({
    count: shouldVirtualize ? feed.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 96,
    overscan: 8,
    // Until the scroll container is measured, assume a window-tall viewport
    // so the first paint already shows a screenful of rows.
    initialRect: { width: 0, height: typeof window === "undefined" ? 800 : window.innerHeight },
    scrollMargin: listRef.current?.offsetTop ?? 0,
    getItemKey: (index) => feed[index]?.path ?? index,
  });

  useEffect(() => {
    setSelectedIndex((index) => Math.min(index, Math.max(0, feed.length - 1)));
  }, [feed.length]);

  // Home pressed while the feed is open: back to the top (and the newest
  // note). The first value is the one the feed mounted with, so opening the
  // feed doesn't scroll.
  const topRequest = useAtomValue(atom_homeFeedTopRequest);
  const mountedTopRequest = useRef(topRequest);
  useEffect(() => {
    if (topRequest === mountedTopRequest.current) return;
    mountedTopRequest.current = topRequest;
    setSelectedIndex(0);
    const element = scrollRef.current;
    if (!element) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (element.scrollTo) element.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    else element.scrollTop = 0;
  }, [topRequest]);

  const latest = useRef({ feed, selectedIndex, shouldVirtualize, rowVirtualizer, onOpenNote, onSearch, onClose });
  latest.current = { feed, selectedIndex, shouldVirtualize, rowVirtualizer, onOpenNote, onSearch, onClose };

  // Selects a row and scrolls it into view: "nearest" for j/k steps,
  // "start" for a week-strip jump (the day's first note at the top).
  const select = useCallback((index: number, block: "nearest" | "start") => {
    const { shouldVirtualize: virtual, rowVirtualizer: virtualizer } = latest.current;
    setSelectedIndex(index);
    if (virtual) virtualizer.scrollToIndex(index, { align: block === "start" ? "start" : "auto" });
    else rowRefs.current[index]?.scrollIntoView?.({ block });
  }, []);

  useEffect(() => {
    const move = (delta: number) => {
      const { feed: rows, selectedIndex: index } = latest.current;
      if (!rows.length) return;
      select(Math.min(rows.length - 1, Math.max(0, index + delta)), "nearest");
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) return;
      // The editor's global handler already prevents default on Escape.
      if (event.key === "Escape") { latest.current.onClose(); return; }
      if (event.defaultPrevented) return;
      const { feed: rows, selectedIndex: index } = latest.current;
      if (event.key === "ArrowDown" || event.key === "j") { event.preventDefault(); move(1); return; }
      if (event.key === "ArrowUp" || event.key === "k") { event.preventDefault(); move(-1); return; }
      if (event.key === "Enter") {
        // A focused button handles its own Enter (click).
        if ((event.target as HTMLElement | null)?.closest?.("button") || !rows[index]) return;
        event.preventDefault();
        latest.current.onOpenNote(rows[index].path);
        return;
      }
      if (event.key.length === 1 && event.key.trim()) {
        event.preventDefault();
        latest.current.onSearch(event.key);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [select]);

  const renderRow = (index: number, ref?: (element: HTMLDivElement | null) => void) => {
    const entry = feed[index];
    return (
      <FeedRow
        ref={ref}
        entry={entry}
        isSelected={index === selectedIndex}
        onOpen={() => onOpenNote(entry.path)}
        onHover={() => setSelectedIndex(index)}
      />
    );
  };

  return (
    <div ref={scrollRef} className="relative h-full overflow-y-auto bg-surface" data-testid="home-feed">
      <div className="mx-auto w-full max-w-2xl px-4 pb-40 sm:px-8">
        {/* The open vault, in a bar at the very top, well clear of the greeting. */}
        {hasVault && <FeedVault />}
        <FeedHeader now={now} userName={userName}>
          {feed.length > 0 && (
            <WeekStrip
              days={week}
              now={now}
              activeDay={activeDay(feed[selectedIndex]?.modifiedAt)}
              onJump={(index) => select(index, "start")}
            />
          )}
        </FeedHeader>
        {isIndexing && hasVault && <FeedStatus />}
        {!hasVault ? (
          <FeedStart onNewNote={onNewNote} onOpenFile={() => onOpenFile?.()} />
        ) : feed.length === 0 && isIndexing ? (
          <FeedSkeleton />
        ) : feed.length === 0 ? (
          <Button variant="bare" onClick={onNewNote} className="text-ui-body text-fg-muted">
            Start writing
          </Button>
        ) : shouldVirtualize ? (
          <div
            ref={listRef}
            role="listbox"
            aria-label="Recent notes"
            className="relative w-full"
            style={{ height: rowVirtualizer.getTotalSize() }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                className="absolute left-0 top-0 w-full pb-1"
                style={{ transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)` }}
              >
                {renderRow(virtualRow.index)}
              </div>
            ))}
          </div>
        ) : (
          <div ref={listRef} role="listbox" aria-label="Recent notes" className="flex flex-col gap-1">
            {feed.map((entry, index) => (
              <React.Fragment key={entry.path}>
                {renderRow(index, (element) => { rowRefs.current[index] = element; })}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
      {/* No notes to search without a vault: the pill opens the command list. */}
      <FeedBar
        onSearch={() => onSearch(hasVault ? undefined : ">")}
        onSearchCommands={() => onSearch(">")}
        onNewNote={onNewNote}
        isSearchOpen={isSearchOpen}
        placeholder={hasVault ? undefined : "Search commands…"}
      />
    </div>
  );
}
