"use client";

import React from "react";
import { HiOutlinePencilAlt } from "react-icons/hi";
import { VscLayoutSidebarLeft } from "react-icons/vsc";
import Button from "@/app/components/Button";
import { formatShortcut, isMacPlatform } from "@/app/utils/platform";
import { PANE_HEADER_HEIGHT, PANE_ICON_SIZE } from "../pane-header-classes";
import PaneToolbarButton from "../PaneToolbarButton";

// The sidebar's top bar, level with the pane toolbar: the app's name as a
// quiet wordmark (a click on it hides the sidebar too), New note and the
// button that hides the sidebar (the toolbar shows it again). Vaults are switched from the pane title's first
// crumb (PaneTitle) or the command palette.
export default function SidebarHeader({ onNewNote, onHide }: { onNewNote: () => void; onHide: () => void }) {
  return (
    <div className={`flex items-center gap-1 shrink-0 px-2 ${PANE_HEADER_HEIGHT}`}>
      <div className="flex-1 min-w-0">
        <Button
          variant="unstyled"
          onClick={onHide}
          title={`Hide sidebar (${formatShortcut("\\")})`}
          aria-label="HermesMarkdown. Hide sidebar"
          className="flex h-7 max-w-full items-center rounded-md px-2 text-ui-footnote font-semibold text-fg select-none hover:bg-fill"
        >
          <span className="truncate">HermesMarkdown</span>
        </Button>
      </div>
      <PaneToolbarButton
        icon={<HiOutlinePencilAlt size={PANE_ICON_SIZE} />}
        label="New note"
        shortcut={isMacPlatform() ? "⌃⌥N" : "Ctrl+Alt+N"}
        tooltipPosition="bottom-end"
        onClick={onNewNote}
        className="shrink-0"
      />
      {/* A plain icon button: alone, it needs no section capsule. */}
      <PaneToolbarButton
        icon={<VscLayoutSidebarLeft size={PANE_ICON_SIZE} />}
        label="Hide sidebar"
        shortcut={formatShortcut("\\")}
        tooltipPosition="bottom-end"
        onClick={onHide}
        className="shrink-0"
      />
    </div>
  );
}
