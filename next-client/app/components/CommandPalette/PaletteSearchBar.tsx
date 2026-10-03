"use client";

import React from "react";
import { HiOutlineSearch, HiOutlineX } from "react-icons/hi";
import Button from "@/app/components/Button";
import { BareInput } from "@/app/components/Input";
import { formatShortcut } from "@/app/utils/platform";
import { PALETTE_SEARCH_TRANSITION } from "./CommandPaletteContext";
import { COMMAND_TOGGLE_CLASS, SEARCH_FIELD_CLASS, SEARCH_PILL_CLASS } from "./palette-model";

interface PaletteSearchBarProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  isOpen: boolean;
  value: string;
  placeholder: string;
  hasQuery: boolean;
  isCommandMode: boolean;
  activeDescendant?: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onToggleCommands: () => void;
  /** Header actions after the pill (theme, settings, help, close). */
  children?: React.ReactNode;
}

// The palette's search field, drawn as the same pill as the home feed's
// search bar (they morph into each other; see CommandPaletteContext). After
// the field, `>` toggles command mode.
export default function PaletteSearchBar({
  inputRef,
  isOpen,
  value,
  placeholder,
  hasQuery,
  isCommandMode,
  activeDescendant,
  onChange,
  onClear,
  onToggleCommands,
  children,
}: PaletteSearchBarProps) {
  return (
    <div className="flex items-center gap-2 px-3 pb-2 pt-3 font-sans">
      <div
        data-palette-field=""
        className={`${SEARCH_PILL_CLASS} min-w-0 flex-1`}
        style={{ viewTransitionName: isOpen ? PALETTE_SEARCH_TRANSITION : undefined }}
      >
        <div className={SEARCH_FIELD_CLASS}>
          <HiOutlineSearch size={14} className="shrink-0 text-fg-muted" />
          <BareInput
            ref={inputRef}
            type="search"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent text-ui-callout font-normal text-fg outline-none caret-accent placeholder:text-fg-faint [&::-webkit-search-cancel-button]:hidden"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            role="combobox"
            aria-label="Search files and command palette modes"
            aria-expanded={isOpen}
            aria-controls="command-palette-results"
            aria-activedescendant={activeDescendant}
          />
          {hasQuery && (
            <Button variant="icon" onClick={onClear} aria-label="Clear search" className="!h-7 !w-7">
              <HiOutlineX size={14} />
            </Button>
          )}
        </div>
        <Button
          variant="unstyled"
          onClick={onToggleCommands}
          aria-label={isCommandMode ? "Search files" : "Search commands"}
          aria-pressed={isCommandMode}
          title={isCommandMode ? "Back to file search" : `Commands (${formatShortcut("K", { shift: true })})`}
          className={`${COMMAND_TOGGLE_CLASS} ${isCommandMode ? "bg-accent text-white dark:text-surface" : "text-fg-muted hover:bg-surface-raised hover:text-fg"}`}
        >
          &gt;
        </Button>
      </div>
      {children}
    </div>
  );
}
