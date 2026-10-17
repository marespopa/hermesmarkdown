"use client";

import React from "react";
import { HiOutlineSearch } from "react-icons/hi";
import Button from "@/app/components/Button";
import { PALETTE_SEARCH_TRANSITION, useOptionalCommandPalette } from "@/app/components/CommandPalette/CommandPaletteContext";
import { SEARCH_KBD_CLASS, SEARCH_OR_CREATE_PLACEHOLDER } from "@/app/components/CommandPalette/palette-model";
import { formatShortcut } from "@/app/utils/platform";

// The way into the app from the toolbar and every page's title bar: the
// command palette's search field at rest, in toolbar size. It is the
// palette's morph anchor
// (`data-palette-anchor` and the shared view-transition name), so opening
// the palette grows this pill into its field; it hides while the palette is
// open. Only one is on screen at a time.
export default function SearchPill({ className = "" }: { className?: string }) {
  const palette = useOptionalCommandPalette();
  if (!palette) return null;
  const { open, isOpen } = palette;
  return (
    <div
      data-palette-anchor=""
      style={{ viewTransitionName: isOpen ? undefined : PALETTE_SEARCH_TRANSITION }}
      className={`flex min-w-0 items-center rounded-lg bg-black/[0.05] dark:bg-white/[0.07] ${isOpen ? "invisible" : ""} ${className}`}
    >
      <Button
        variant="unstyled"
        onClick={() => open()}
        aria-label={SEARCH_OR_CREATE_PLACEHOLDER}
        aria-keyshortcuts="Control+K Meta+K"
        className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg pl-3 pr-1.5 text-left text-ui-footnote text-fg-faint transition-colors hover:text-fg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sage"
      >
        <HiOutlineSearch size={14} aria-hidden="true" className="shrink-0 text-fg-muted" />
        <span className="flex-1 min-w-0 truncate">{SEARCH_OR_CREATE_PLACEHOLDER}</span>
        <kbd className={SEARCH_KBD_CLASS}>{formatShortcut("K")}</kbd>
      </Button>
    </div>
  );
}
