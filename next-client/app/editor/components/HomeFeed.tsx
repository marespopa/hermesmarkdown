"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useVirtualizer } from "@tanstack/react-virtual";
import { atom_homePinnedPaths, atom_homeTagFilter, atom_toggleHomePin } from "@/app/atoms/home-pin-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_noteDisplayItems } from "@/app/atoms/privacy-atoms";
import { atom_homeFeedTopRequest, atom_indexerState, atom_newNoteFolder, atom_todayFolder, atom_userName } from "@/app/atoms/ui-atoms";
import { atom_templatesFolder } from "@/app/atoms/template-atoms";
import Button from "@/app/components/Button";
import { normalizeFolderPath } from "@/app/hooks/file-system/unique-file";
import { findTodayNote, resolveTodayFolder, todayNoteName } from "@/app/utils/today-note";
import FeedBar from "./home-feed/FeedBar";
import FeedHeader from "./home-feed/FeedHeader";
import FeedRow from "./home-feed/FeedRow";
import FeedSkeleton from "./home-feed/FeedSkeleton";
import FeedStart from "./home-feed/FeedStart";
import FeedVault from "./home-feed/FeedVault";
import FeedStats from "./home-feed/FeedStats";
import FeedStatus from "./home-feed/FeedStatus";
import FeedTags from "./home-feed/FeedTags";
import FeedTasks from "./home-feed/FeedTasks";
import { buildFeed, feedStats, feedTags, isFeedPath, openFeedTasks, withTodaySheet, type FeedEntry } from "./home-feed/feed-model";

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
  /** Opens today's worklog sheet, creating it when it doesn't exist. */
  onOpenToday?: () => void;
  /** Opens a note with the caret on a line (0-indexed): an open task. */
  onOpenTask?: (path: string, line: number) => void;
}

function isTypingTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  return !!element?.closest?.("input, textarea, select, [contenteditable='true'], .cm-editor, [role='dialog']");
}

// A second `g` within this window makes `gg` (to the top), as in vim.
const GG_WINDOW_MS = 600;

// The vault's home screen: recent notes, newest first, in the editor's
// column, under a "Today" row and the open tasks of the past week. Keyboard,
// vim-style: j/k or arrows move, gg/G jump to the top and end, Enter or o
// opens, p pins, t opens today's sheet, / searches, Escape leaves; any other
// printable key opens the command palette with that key typed.
export default function HomeFeed({ onOpenNote, onNewNote, onSearch, onClose, isSearchOpen = false, hasVault = true, onOpenFile, onOpenToday, onOpenTask }: HomeFeedProps) {
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const indexerState = useAtomValue(atom_indexerState);
  const userName = useAtomValue(atom_userName);
  const isIndexing = indexerState !== "idle";
  const displayItems = useAtomValue(atom_noteDisplayItems);
  const templatesFolder = useAtomValue(atom_templatesFolder).folder;
  const pinnedPaths = useAtomValue(atom_homePinnedPaths);
  const togglePin = useSetAtom(atom_toggleHomePin);
  const now = useMemo(() => new Date(), [fileMetadata, displayItems]); // eslint-disable-line react-hooks/exhaustive-deps
  const [tagFilter, setTagFilter] = useAtom(atom_homeTagFilter);
  const allNotes = useMemo(
    () => buildFeed(fileMetadata, displayItems, now, templatesFolder, pinnedPaths),
    [fileMetadata, displayItems, now, templatesFolder, pinnedPaths],
  );
  // Chips count the whole feed, so picking one never hides the others.
  const tags = useMemo(() => feedTags(allNotes), [allNotes]);
  // Today's sheet: where it is, or where "Start today's sheet" will put it.
  // The open tasks and the stats line read the whole feed, not the filtered one.
  const todayPattern = useAtomValue(atom_todayFolder);
  const newNoteFolder = useAtomValue(atom_newNoteFolder);
  const todayFolder = normalizeFolderPath(todayPattern === null ? newNoteFolder : resolveTodayFolder(todayPattern, now));
  const today = useMemo(() => {
    const path = findTodayNote(Object.keys(fileMetadata).filter(isFeedPath), now, todayFolder);
    const fileName = `${todayNoteName(now)}.md`;
    return { path: path ?? (todayFolder ? `${todayFolder}/${fileName}` : fileName), exists: !!path };
  }, [fileMetadata, now, todayFolder]);
  const showToday = hasVault && !!onOpenToday;
  // The tag filter leaves today's sheet in its day, unmarked.
  const feed = useMemo(
    () => (tagFilter.length
      ? buildFeed(fileMetadata, displayItems, now, templatesFolder, pinnedPaths, tagFilter)
      // An empty (or still loading) vault keeps its "Start writing" / skeleton.
      : showToday && allNotes.length > 0 ? withTodaySheet(allNotes, today, now) : allNotes),
    [allNotes, fileMetadata, displayItems, now, templatesFolder, pinnedPaths, tagFilter, showToday, today],
  );
  const openTasks = useMemo(() => openFeedTasks(allNotes, fileMetadata, now), [allNotes, fileMetadata, now]);
  const stats = useMemo(() => feedStats(allNotes, now), [allNotes, now]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const focusPending = useRef(true);
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
    focusPending.current = true;
    setSelectedIndex(0);
    const element = scrollRef.current;
    if (!element) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (element.scrollTo) element.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    else element.scrollTop = 0;
  }, [topRequest]);

  // A new tag filter starts from the newest matching note.
  const appliedFilter = useRef(tagFilter);
  useEffect(() => {
    if (appliedFilter.current === tagFilter) return;
    appliedFilter.current = tagFilter;
    setSelectedIndex(0);
  }, [tagFilter]);

  // The "Start today's sheet" row isn't a note yet: it starts the sheet.
  const openEntry = (entry: FeedEntry) =>
    (entry.todaySheet === "missing" && onOpenToday ? onOpenToday() : onOpenNote(entry.path));

  const latest = useRef({ feed, selectedIndex, shouldVirtualize, rowVirtualizer, openEntry, onSearch, onClose, togglePin, onOpenToday, showToday });
  latest.current = { feed, selectedIndex, shouldVirtualize, rowVirtualizer, openEntry, onSearch, onClose, togglePin, onOpenToday, showToday };

  // Selects a row and scrolls it into view.
  const select = useCallback((index: number) => {
    const { shouldVirtualize: virtual, rowVirtualizer: virtualizer } = latest.current;
    setSelectedIndex(index);
    if (virtual) virtualizer.scrollToIndex(index, { align: "auto" });
    else rowRefs.current[index]?.scrollIntoView?.({ block: "nearest" });
  }, []);

  // The note list takes focus when the feed opens (and on Home), so j/k and
  // Enter work without a click first. The list, not a row: a focused row
  // would unblur a sensitive preview, and Enter on a row button opens that
  // row rather than the selection. Never taken from a field or a dialog
  // (the palette): it waits for those to close. Retries each render until
  // the first notes are listed.
  useEffect(() => {
    const list = listRef.current;
    if (!focusPending.current || !list || isTypingTarget(document.activeElement)) return;
    focusPending.current = false;
    if (!list.contains(document.activeElement)) list.focus({ preventScroll: true });
  });

  // `p` moves the note (pinned notes lead the feed): the selection follows it.
  const pinnedByKey = useRef<string | null>(null);
  useEffect(() => {
    const path = pinnedByKey.current;
    if (!path) return;
    pinnedByKey.current = null;
    const index = feed.findIndex((entry) => entry.path === path);
    if (index >= 0) select(index);
  }, [feed, select]);

  useEffect(() => {
    const move = (delta: number) => {
      const { feed: rows, selectedIndex: index } = latest.current;
      if (!rows.length) return;
      select(Math.min(rows.length - 1, Math.max(0, index + delta)));
    };
    let lastG = 0;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) return;
      // An open menu (vault, or a row's) owns the keys; its Escape closes only it.
      if (document.querySelector('[role="menu"]')) return;
      // The editor's global handler already prevents default on Escape.
      if (event.key === "Escape") { latest.current.onClose(); return; }
      if (event.defaultPrevented) return;
      const { feed: rows, selectedIndex: index } = latest.current;
      if (event.key === "ArrowDown" || event.key === "j") { event.preventDefault(); move(1); return; }
      if (event.key === "ArrowUp" || event.key === "k") { event.preventDefault(); move(-1); return; }
      // A lone g waits for its pair; it never opens the palette.
      if (event.key === "g") {
        event.preventDefault();
        // gg: the newest note, with the feed back at its very top (header in view).
        if (event.timeStamp - lastG <= GG_WINDOW_MS && rows.length) {
          lastG = 0;
          select(0);
          if (scrollRef.current) scrollRef.current.scrollTop = 0;
        }
        else lastG = event.timeStamp;
        return;
      }
      lastG = 0;
      if (event.key === "G") { event.preventDefault(); if (rows.length) select(rows.length - 1); return; }
      if (event.key === "/") { event.preventDefault(); latest.current.onSearch(); return; }
      if (event.key === "t" && latest.current.showToday && latest.current.onOpenToday) {
        event.preventDefault();
        latest.current.onOpenToday();
        return;
      }
      if (event.key === "Enter" || event.key === "o") {
        // A focused button handles its own Enter (click).
        if (event.key === "Enter" && (event.target as HTMLElement | null)?.closest?.("button")) return;
        if (!rows[index]) return;
        event.preventDefault();
        latest.current.openEntry(rows[index]);
        return;
      }
      if (event.key === "p") {
        event.preventDefault();
        if (!rows[index] || rows[index].todaySheet === "missing") return;
        pinnedByKey.current = rows[index].path;
        latest.current.togglePin(rows[index].path);
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
        onOpen={() => openEntry(entry)}
        onHover={() => setSelectedIndex(index)}
        onTogglePin={() => togglePin(entry.path)}
      />
    );
  };

  return (
    <div ref={scrollRef} className="relative h-full overflow-y-auto bg-surface" data-testid="home-feed">
      <div className="mx-auto w-full max-w-2xl px-4 pb-40 sm:px-8">
        {/* The open vault, in a bar at the very top, well clear of the greeting. */}
        {hasVault && <FeedVault />}
        <FeedHeader now={now} userName={userName}>
          {hasVault && <FeedStats stats={stats} openTasks={openTasks.length} />}
        </FeedHeader>
        {hasVault && onOpenTask && openTasks.length > 0 && (
          <div className="-mt-4 mb-8">
            <FeedTasks tasks={openTasks} onOpenTask={onOpenTask} />
          </div>
        )}
        {hasVault && <FeedTags tags={tags} selected={tagFilter} onChange={setTagFilter} />}
        {isIndexing && hasVault && <FeedStatus />}
        {!hasVault ? (
          <FeedStart onNewNote={onNewNote} onOpenFile={() => onOpenFile?.()} />
        ) : feed.length === 0 && tagFilter.length > 0 ? (
          <p className="text-ui-body text-fg-muted">
            No notes tagged {tagFilter.map((tag) => `#${tag}`).join(" and ")}.
          </p>
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
            tabIndex={-1}
            className="relative w-full focus-visible:outline-none"
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
          <div ref={listRef} role="listbox" aria-label="Recent notes" tabIndex={-1} className="flex flex-col gap-1 focus-visible:outline-none">
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
