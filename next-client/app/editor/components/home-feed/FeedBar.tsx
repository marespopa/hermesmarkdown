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

interface FeedBarProps {
  onSearch: () => void;
  /** Opens the palette in command mode (`>`). */
  onSearchCommands: () => void;
  onNewNote: () => void;
  /** While the palette is open its search field holds the shared transition name. */
  isSearchOpen?: boolean;
}

// Floating bar centered under the feed column (thumb reach on mobile, kept
// above the on-screen keyboard): the search pill and a one-tap new note.
// The pill is the palette's search field at rest — same classes as
// PaletteSearchBar and a shared view-transition name, so opening the palette
// morphs the pill into the field and closing morphs it back.
export default function FeedBar({ onSearch, onSearchCommands, onNewNote, isSearchOpen = false }: FeedBarProps) {
  const keyboardInset = useKeyboardInset();
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4"
      style={{ bottom: keyboardInset + 20 }}
    >
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-2">
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
            <span className="flex-1 truncate">{SEARCH_OR_CREATE_PLACEHOLDER}</span>
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
          className="flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-full bg-sage text-white shadow-lg transition-transform hover:scale-105 active:scale-95 dark:text-surface"
        >
          <HiOutlinePlus size={20} />
        </Button>
      </div>
    </div>
  );
}
