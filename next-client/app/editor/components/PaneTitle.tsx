"use client";

import React from "react";
import { HiOutlineChevronDown } from "react-icons/hi";
import Button from "@/app/components/Button";
import Tooltip from "@/app/components/Tooltip";
import { formatShortcut } from "@/app/utils/platform";
import { statusDot, type SaveState } from "./save-state";

interface PaneTitleProps {
  /** The note's name as shown, without `.md`; null when nothing is open. */
  title: string | null;
  saveState: SaveState;
  saveErrorMessage?: string;
  /** Opens the command palette, where every note and command is. */
  onOpen: () => void;
  /** The note's menu (Copy Markdown, Open in pane, Pin, Close). */
  onContextMenu: (event: React.MouseEvent) => void;
}

// The pane's one control, in place of a toolbar, as on mobile: the note in
// front by name with a chevron, and a small dot only when its save state
// needs a glance (unsaved, saving, error). It is the way into the command
// palette, the center of the app: a click opens it to switch notes or run
// anything; a right-click opens the note's own menu. It floats over the
// page on a soft paper backing, so it stays readable over scrolled text.
export default function PaneTitle({ title, saveState, saveErrorMessage, onOpen, onContextMenu }: PaneTitleProps) {
  const dot = statusDot[saveState];
  const showDot = saveState === "dirty" || saveState === "saving" || saveState === "error";
  const dotTitle = saveState === "error" ? saveErrorMessage || dot.title : dot.title;
  const label = title ?? "No note open";

  return (
    <Tooltip label="Go to a note or command" shortcut={formatShortcut("K")} position="bottom" portal>
      <Button
        variant="unstyled"
        onClick={onOpen}
        onContextMenu={onContextMenu}
        aria-label={showDot ? `${label} — ${dotTitle}. Go to a note or command` : `${label}. Go to a note or command`}
        className="flex h-8 min-w-0 max-w-[min(32rem,100%)] items-center gap-1.5 rounded-lg bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] px-3 text-ui-footnote text-fg-muted backdrop-blur-sm transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--fg)_6%,var(--surface))] hover:text-fg"
      >
        {showDot && (
          <span aria-hidden="true" title={dotTitle} className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot.className}`} />
        )}
        <span className="truncate">{label}</span>
        <HiOutlineChevronDown size={12} aria-hidden="true" className="shrink-0" />
      </Button>
    </Tooltip>
  );
}
