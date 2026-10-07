"use client";

import { HiOutlinePlus, HiOutlineSearch } from "react-icons/hi";
import Button from "@/app/components/Button";
import { PALETTE_SEARCH_TRANSITION } from "@/app/components/CommandPalette/CommandPaletteContext";
import {
  COMMAND_TOGGLE_CLASS,
  SEARCH_FIELD_CLASS,
  SEARCH_KBD_CLASS,
  SEARCH_OR_CREATE_PLACEHOLDER,
  SEARCH_PILL_CLASS,
} from "@/app/components/CommandPalette/palette-model";
import useKeyboardInset from "@/app/hooks/use-keyboard-inset";
import { formatShortcut } from "@/app/utils/platform";
import FeedKeyHints from "./FeedKeyHints";

const SMALL_PHONE_PLACEHOLDER = "Search or create…";

interface FeedBarProps {
  onSearch: () => void;
  /** Opens the palette in command mode (`>`). */
  onSearchCommands: () => void;
  onNewNote: () => void;
  /** While the palette is open its search field holds the shared transition name. */
  isSearchOpen?: boolean;
  /** The pill's wording; "Search or create a note…" (shortened on small phones) when omitted. */
  placeholder?: string;
  /** Shows the line of vim-style keys above the bar (hidden below `sm`). */
  showKeyHints?: boolean;
}

// Floating bar centered under the feed column (thumb reach on mobile, kept
// above the on-screen keyboard): the search pill and a one-tap new note.
// Below 400px (small phones) the placeholder shortens so it isn't cut off.
// With `showKeyHints`, a pill of the feed's keys sits just above it, left-
// aligned with the search pill; it takes no clicks, so rows behind stay usable.
// The pill is the palette's search field at rest — same classes as
// PaletteSearchBar and a shared view-transition name, so opening the palette
// morphs the pill into the field and closing morphs it back.
export default function FeedBar({ onSearch, onSearchCommands, onNewNote, isSearchOpen = false, placeholder, showKeyHints = false }: FeedBarProps) {
  const keyboardInset = useKeyboardInset();
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-30 flex flex-col items-center gap-2.5 px-3 sm:px-4"
      style={{ bottom: keyboardInset + 20 }}
    >
      {/* In the bar's column, so the hints line up with the search pill's left edge. */}
      {showKeyHints && !isSearchOpen && (
        <div className="w-full max-w-xl">
          <FeedKeyHints />
        </div>
      )}
      <div className="pointer-events-auto flex w-full max-w-xl items-center gap-1.5 sm:gap-2">
        <div
          data-palette-anchor=""
          className={`${SEARCH_PILL_CLASS} min-w-0 flex-1 shadow-lg ${isSearchOpen ? "invisible" : ""}`}
          style={{ viewTransitionName: isSearchOpen ? undefined : PALETTE_SEARCH_TRANSITION }}
        >
          <Button
            variant="unstyled"
            onClick={onSearch}
            className={`${SEARCH_FIELD_CLASS} text-left text-ui-callout text-fg-faint transition-colors hover:text-fg-muted`}
          >
            <HiOutlineSearch size={14} className="shrink-0 text-fg-muted" />
            <span className="flex-1 truncate">
              {placeholder ?? (
                <>
                  <span className="min-[400px]:hidden">{SMALL_PHONE_PLACEHOLDER}</span>
                  <span className="hidden min-[400px]:inline">{SEARCH_OR_CREATE_PLACEHOLDER}</span>
                </>
              )}
            </span>
            <kbd className={SEARCH_KBD_CLASS}>{formatShortcut("K")}</kbd>
          </Button>
          <Button
            variant="unstyled"
            onClick={onSearchCommands}
            aria-label="Search commands"
            title={`Commands (${formatShortcut("K", { shift: true })})`}
            className={`${COMMAND_TOGGLE_CLASS} text-fg-muted hover:bg-surface-raised hover:text-fg`}
          >
            &gt;
          </Button>
        </div>
        <Button
          variant="unstyled"
          onClick={onNewNote}
          aria-label="New note"
          title="New note"
          className="flex h-12 w-12 sm:h-[3.25rem] sm:w-[3.25rem] shrink-0 items-center justify-center rounded-full bg-sage text-white shadow-lg transition-transform hover:scale-105 active:scale-95 dark:text-surface"
        >
          <HiOutlinePlus size={20} />
        </Button>
      </div>
    </div>
  );
}
