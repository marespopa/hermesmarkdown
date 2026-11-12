"use client";

import React from "react";
import { HiOutlineSearch } from "react-icons/hi";
import { useOptionalCommandPalette } from "@/app/components/CommandPalette/CommandPaletteContext";
import { SEARCH_OR_CREATE_PLACEHOLDER } from "@/app/components/CommandPalette/palette-model";
import { formatShortcut } from "@/app/utils/platform";
import CornerButton from "./CornerButton";

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
    <CornerButton
      icon={<HiOutlineSearch size={16} aria-hidden="true" />}
      label={SEARCH_OR_CREATE_PLACEHOLDER}
      shortcut={formatShortcut("P")}
      onClick={() => palette.open()}
      aria-keyshortcuts="Control+P Meta+P"
      className={className}
    />
  );
}
