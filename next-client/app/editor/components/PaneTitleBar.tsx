"use client";

import React from "react";
import { HiOutlineChatAlt2, HiOutlineDotsHorizontal, HiOutlineHome, HiOutlineSave, HiOutlineSearch } from "react-icons/hi";
import Button from "@/app/components/Button";
import Tooltip from "@/app/components/Tooltip";
import { formatShortcut } from "@/app/utils/platform";
import { statusDot, statusMeta, type TabSaveState } from "./PaneTab";

interface PaneTitleBarProps {
  title: string;
  saveState: TabSaveState;
  saveErrorMessage?: string;
  /** Home appears only with a vault open (the feed lists vault notes). */
  onHome?: () => void;
  onOpenPalette: () => void;
  /** Shown only when an AI key is configured. */
  onOpenAIChat?: () => void;
  onSave: () => void;
  onOptions: (anchor: DOMRect) => void;
}

// Shared look of the pane header, so one tab and many tabs read as the same bar.
export const PANE_HEADER_CLASS =
  "flex items-center bg-chrome/80 backdrop-blur-2xl border-b border-edge-subtle h-11 shrink-0 relative z-20 px-2 sm:px-3";
export const PANE_ACTIONS_CLASS =
  "flex items-center gap-0.5 mx-1 pl-1 pr-1 shrink-0 h-8 rounded-xl bg-surface-raised/70 z-20";
export const PANE_ACTION_BUTTON_CLASS =
  "w-8 h-8 flex items-center justify-center text-ink-muted hover:text-ink-light dark:hover:text-ink-dark transition-all rounded-lg disabled:opacity-40 disabled:pointer-events-none";

// Header for a pane showing a single note (tab strip auto-hidden). Same bar
// and action capsule as the tab strip, with the note's title centered in
// place of the tabs: Home on the left; palette, AI Chat (with a key set),
// Save and More on the right.
export default function PaneTitleBar({ title, saveState, saveErrorMessage, onHome, onOpenPalette, onOpenAIChat, onSave, onOptions }: PaneTitleBarProps) {
  const meta = statusMeta[saveState];
  const dot = statusDot[saveState];
  const saveTitle = saveState === "error" ? saveErrorMessage || meta.title : meta.title;

  return (
    <header className={`${PANE_HEADER_CLASS} grid grid-cols-[1fr_auto_1fr] gap-2`} aria-label="Note">
      <div className="flex items-center">
        {onHome && (
          <div className={`${PANE_ACTIONS_CLASS} !mx-0`}>
            <Tooltip label="Home feed" position="bottom">
              <Button variant="icon" onClick={onHome} aria-label="Home feed" className={PANE_ACTION_BUTTON_CLASS}>
                <HiOutlineHome size={17} />
              </Button>
            </Tooltip>
          </div>
        )}
      </div>

      <div className="flex min-w-0 max-w-[min(28rem,50vw)] items-center justify-center gap-1.5" title={title}>
        <span className="truncate text-[13px] font-medium tracking-tight text-ink-light dark:text-ink-dark">{title}</span>
        {saveState !== "idle" && saveState !== "saved" && (
          <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot.className}`} />
        )}
      </div>

      <div className="flex items-center justify-end">
        <div className={`${PANE_ACTIONS_CLASS} !mx-0`}>
          <Tooltip label="Command palette" shortcut={formatShortcut("K")} position="bottom-end">
            <Button variant="icon" onClick={onOpenPalette} aria-label="Command palette" className={PANE_ACTION_BUTTON_CLASS}>
              <HiOutlineSearch size={17} />
            </Button>
          </Tooltip>
          {onOpenAIChat && (
            <Tooltip label="AI Chat" shortcut={formatShortcut("B", { shift: true })} position="bottom-end">
              <Button variant="icon" onClick={onOpenAIChat} aria-label="AI Chat" className={PANE_ACTION_BUTTON_CLASS}>
                <HiOutlineChatAlt2 size={17} />
              </Button>
            </Tooltip>
          )}
          <Tooltip label={saveTitle} shortcut={formatShortcut("S")} position="bottom-end">
            <Button
              variant="icon"
              onClick={onSave}
              disabled={saveState === "saving"}
              aria-label={`Save — ${meta.title}`}
              className={PANE_ACTION_BUTTON_CLASS}
            >
              {saveState === "saving" ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-edge border-t-sage" />
              ) : meta.Icon ? (
                <meta.Icon size={18} className={saveState === "idle" ? undefined : meta.className} />
              ) : (
                <HiOutlineSave size={18} />
              )}
            </Button>
          </Tooltip>
          <div className="mx-1 h-4 w-px bg-edge-subtle opacity-70" />
          <Tooltip label="More" position="bottom-end">
            <Button
              variant="icon"
              onClick={(e: React.MouseEvent<HTMLElement>) => onOptions(e.currentTarget.getBoundingClientRect())}
              aria-label="Tab options"
              className={PANE_ACTION_BUTTON_CLASS}
            >
              <HiOutlineDotsHorizontal size={16} />
            </Button>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
