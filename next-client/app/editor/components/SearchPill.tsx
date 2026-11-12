"use client";

import React from "react";
import { HiOutlineSearch } from "react-icons/hi";
import Button from "@/app/components/Button";
import { useOptionalCommandPalette } from "@/app/components/CommandPalette/CommandPaletteContext";
import { SEARCH_OR_CREATE_PLACEHOLDER } from "@/app/components/CommandPalette/palette-model";
import Tooltip from "@/app/components/Tooltip";
import { formatShortcut } from "@/app/utils/platform";

// The way into the app from the editor's top-right corner and every page's
// title bar: a search button, toolbar size, a square with the magnifier
// centered, like the other corner buttons. It opens the command palette,
// which appears as one panel of its own.
export const SEARCH_PILL_WIDTH = "2rem";
// The editor corner's width: the No Distraction, Copy Contents and Settings
// buttons (2rem each), their gaps and the SearchPill, so the pane's floating title
// keeps clear of it. (While No Distraction Mode is on, its exit button joins
// it for a moment, but the title is hidden then.)
export const EDITOR_CORNER_WIDTH = `calc(${SEARCH_PILL_WIDTH} + 7.125rem)`;

export default function SearchPill({ className = "" }: { className?: string }) {
  const palette = useOptionalCommandPalette();
  if (!palette) return null;
  return (
    <Tooltip label={SEARCH_OR_CREATE_PLACEHOLDER} shortcut={formatShortcut("P")} position="bottom" portal>
      <Button
        variant="unstyled"
        onClick={() => palette.open()}
        aria-label={SEARCH_OR_CREATE_PLACEHOLDER}
        aria-keyshortcuts="Control+P Meta+P"
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/[0.05] text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sage dark:bg-white/[0.07] ${className}`}
      >
        <HiOutlineSearch size={16} aria-hidden="true" />
      </Button>
    </Tooltip>
  );
}
