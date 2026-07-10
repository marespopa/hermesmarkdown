"use client";

import React from "react";
import { useAtomValue } from "jotai";
import {
  atom_workspaceLayout,
  atom_activePaneId,
  atom_openFiles,
  findLeaf,
} from "@/app/atoms/atoms";
import useKeyboardInset from "@/app/hooks/use-keyboard-inset";
import { HiOutlineChevronDown } from "react-icons/hi";
import { useCommandPalette } from "@/app/components/CommandPalette/CommandPaletteContext";

// Tapping the title always opens the command palette — command-palette-first
// applies here too, so this isn't a file-switcher dropdown, just the
// always-present tap target for it (see EditorCommands.tsx /
// plans/hermes-design.md "Icon Rail"). Switching between already-open tabs
// happens by picking the file again in the palette.
export default function MobileFileIndicator() {
  const isKeyboardOpen = useKeyboardInset() > 0;
  const workspaceLayout = useAtomValue(atom_workspaceLayout);
  const activePaneId = useAtomValue(atom_activePaneId);
  const openFiles = useAtomValue(atom_openFiles);
  const { open: openCommandPalette } = useCommandPalette();

  if (isKeyboardOpen) return null;

  const leaf = activePaneId ? findLeaf(workspaceLayout.rootContainer, activePaneId) : null;
  const hasOpenFiles = !!leaf && leaf.openFilePaths.length > 0;
  const activePath = leaf?.activeFilePath;
  // Stays mounted (as "Search files…") even with nothing open — mobile has
  // no keyboard shortcut, and since MobileControlRail was retired this is
  // the only always-present entry point to the palette.
  const label = hasOpenFiles
    ? (activePath ? (openFiles[activePath]?.fileName || activePath.split("/").pop()) : "untitled")
    : "Search files…";

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => openCommandPalette()}
        aria-label="Search files"
        className="w-full flex items-center justify-center gap-1.5 h-9 bg-chrome border-b border-edge-subtle text-ui-footnote text-fg-muted px-3"
      >
        <span className="truncate">{label}</span>
        <HiOutlineChevronDown size={12} className="shrink-0" />
      </button>
    </div>
  );
}
