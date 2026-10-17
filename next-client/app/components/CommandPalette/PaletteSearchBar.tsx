"use client";

import React from "react";
import { HiOutlineSearch, HiOutlineX } from "react-icons/hi";
import Button from "@/app/components/Button";
import { BareInput } from "@/app/components/Input";
import { PALETTE_SEARCH_TRANSITION } from "./CommandPaletteContext";
import { PALETTE_FIELD_CLASS } from "./palette-model";

interface PaletteSearchBarProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  isOpen: boolean;
  value: string;
  placeholder: string;
  hasQuery: boolean;
  activeDescendant?: string;
  onChange: (value: string) => void;
  onClear: () => void;
  /** Actions after the input (Back in a menu, Close on mobile). */
  children?: React.ReactNode;
}

// The palette's search field: the panel's top edge, full width, with a
// hairline under it (the toolbar's SearchPill morphs into it; see
// CommandPaletteContext). The modes (`>` commands and the rest) are the footer's.
export default function PaletteSearchBar({
  inputRef,
  isOpen,
  value,
  placeholder,
  hasQuery,
  activeDescendant,
  onChange,
  onClear,
  children,
}: PaletteSearchBarProps) {
  return (
    <div
      data-palette-field=""
      className={PALETTE_FIELD_CLASS}
      style={{ viewTransitionName: isOpen ? PALETTE_SEARCH_TRANSITION : undefined }}
    >
      <HiOutlineSearch size={18} aria-hidden="true" className="shrink-0 text-fg-muted" />
      <BareInput
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent text-[17px] font-normal tracking-[-0.01em] text-fg outline-none caret-accent placeholder:text-fg-faint [&::-webkit-search-cancel-button]:hidden"
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
        <Button variant="icon" onClick={onClear} aria-label="Clear search" className="!h-7 !w-7 shrink-0">
          <HiOutlineX size={14} />
        </Button>
      )}
      {children}
    </div>
  );
}
