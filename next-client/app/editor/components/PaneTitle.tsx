"use client";

import React from "react";
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

// The pane's quiet title, in place of a tab strip: the note in front, and a
// small dot only when its save state needs a glance (unsaved, saving,
// error). It is the way into the command palette, the center of the app:
// a click opens it to switch notes or run anything; a right-click opens the
// note's own menu.
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
        className="group flex h-8 min-w-0 max-w-[min(32rem,100%)] items-center gap-2 rounded-lg px-3 text-ui-footnote text-fg-muted transition-colors duration-150 hover:bg-black/[0.05] hover:text-fg dark:hover:bg-white/[0.08]"
      >
        <span className={`truncate ${title ? "font-medium text-fg" : ""}`}>{label}</span>
        {showDot && (
          <span aria-hidden="true" title={dotTitle} className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot.className}`} />
        )}
      </Button>
    </Tooltip>
  );
}
