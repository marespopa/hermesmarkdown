"use client";

import React from "react";
import { HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineSave, HiOutlineX } from "react-icons/hi";
import Tooltip from "@/app/components/Tooltip";
import { formatShortcut } from "@/app/utils/platform";
import Button from "@/app/components/Button";

export type TabSaveState = "idle" | "dirty" | "saving" | "saved" | "error";

interface PaneTabProps {
  fileName: string;
  shortcutNumber?: number;
  isActive: boolean;
  saveState: TabSaveState;
  saveErrorMessage?: string;
  isDraggedOver: boolean;
  onClose: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export const statusDot: Record<TabSaveState, { className: string; title: string }> = {
  idle: { className: "bg-fg-faint/40", title: "Saved" },
  dirty: { className: "bg-amber-500", title: "Unsaved changes" },
  saving: { className: "bg-sage animate-pulse", title: "Saving…" },
  saved: { className: "bg-emerald-500", title: "Saved" },
  error: { className: "bg-red-500", title: "Save error" },
};

// Icon + label version — used where there's room to spell out the state
// explicitly (mobile header, pane Save button) rather than relying on a
// color-coded dot, which tested as unclear on its own. Each state differs in
// shape, not only color: unsaved adds a badge to the save glyph, saved is a
// check, error an exclamation mark.
export const statusMeta: Record<
  TabSaveState,
  {
    Icon: React.ComponentType<{ size?: number; className?: string }> | null;
    badge?: boolean;
    className: string;
    title: string;
    label: string;
  }
> = {
  idle: { Icon: HiOutlineSave, className: "text-fg-faint", title: "Saved", label: "Saved" },
  dirty: { Icon: HiOutlineSave, badge: true, className: "text-amber-500", title: "Unsaved changes", label: "Unsaved" },
  saving: { Icon: null, className: "text-sage", title: "Saving…", label: "Saving…" },
  saved: { Icon: HiOutlineCheckCircle, className: "text-emerald-500", title: "Saved", label: "Saved" },
  error: { Icon: HiOutlineExclamationCircle, className: "text-red-500", title: "Save error", label: "Error" },
};

// The glyph for a save state: a spinner while saving, otherwise the state's
// icon, with a dot badge while there are unsaved changes.
export function SaveStateIcon({ state, size, className }: { state: TabSaveState; size: number; className?: string }) {
  const meta = statusMeta[state];
  if (!meta.Icon) {
    return <span className="block w-3.5 h-3.5 rounded-full border-2 border-edge border-t-sage animate-spin" />;
  }
  return (
    <span className={`relative inline-flex ${className ?? ""}`}>
      <meta.Icon size={size} />
      {meta.badge && (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-chrome"
        />
      )}
    </span>
  );
}

export default function PaneTab({
  fileName,
  shortcutNumber,
  isActive,
  saveState,
  saveErrorMessage,
  isDraggedOver,
  onClose,
  onClick,
  onContextMenu,
  draggable,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: PaneTabProps) {
  const dot = statusDot[saveState];
  const showDot = saveState !== "idle" && saveState !== "saved";
  const dotTitle = saveState === "error" ? (saveErrorMessage || dot.title) : dot.title;

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      // Middle-click closes the tab; swallowing the press keeps the browser
      // from starting autoscroll.
      onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }}
      onAuxClick={(e) => {
        if (e.button !== 1) return;
        e.preventDefault();
        onClose(e);
      }}
      onContextMenu={onContextMenu}
      // The Ctrl/Cmd+N shortcut lives in the tooltip, not on the tab, to keep tabs narrow.
      title={[showDot ? `${fileName} — ${dotTitle}` : fileName, shortcutNumber && formatShortcut(String(shortcutNumber))]
        .filter(Boolean)
        .join(" · ")}
      className={[
        // Pills on the header's chrome: every tab sits on a subtle translucent
        // fill (static black / white — the var-backed surface tokens drop
        // opacity modifiers); the active one is a raised paper pill with a
        // hairline ring.
        "group relative flex items-center h-8 pl-3 pr-1.5 rounded-lg mx-0.5 cursor-pointer shrink-0",
        "min-w-[96px] max-w-[240px] w-fit",
        "select-none transition-[background-color,box-shadow,color] duration-150",
        isActive
          ? "bg-surface shadow-sm ring-1 ring-black/5 dark:ring-white/10 text-ink-light dark:text-ink-dark"
          : "bg-black/[0.04] dark:bg-white/[0.05] text-fg-muted hover:bg-black/[0.08] dark:hover:bg-white/[0.09] hover:text-fg dark:text-stone dark:hover:text-ink-dark",
        isDraggedOver ? "ring-2 ring-sage/40 ring-inset" : "",
      ].join(" ")}
    >
      {/* File name */}
      <span
        className={[
          "flex-1 truncate text-[12px] leading-none tracking-tight",
          isActive ? "font-medium" : "font-normal",
        ].join(" ")}
      >
        {fileName}
      </span>


      {/* Trailing slot: close button, with the unsaved/saving/error dot on
          top of it until the tab is hovered or focused — the dot turns into
          the close button, so a tab with changes can still be closed by click.
          The slot keeps its width when empty so the name never shifts. */}
      <span className="relative shrink-0 flex items-center justify-center w-5 h-5 ml-1.5">
        <Tooltip label="Close tab" position="bottom" portal>
          <Button variant="unstyled"
            onClick={onClose}
            aria-label="Close tab"
            className={[
              "flex items-center justify-center w-5 h-5 rounded-md",
              "text-fg-muted hover:text-fg dark:text-stone dark:hover:text-ink-dark",
              "hover:bg-edge-subtle/60 focus-visible:opacity-100",
              "transition-opacity duration-100",
              isActive && !showDot
                ? "opacity-60 hover:opacity-100"
                : "opacity-0 group-hover:opacity-60 hover:!opacity-100",
            ].join(" ")}
          >
            <HiOutlineX size={12} />
          </Button>
        </Tooltip>
        {showDot && (
          <span
            title={dotTitle}
            className={[
              "absolute inset-0 m-auto block w-2 h-2 rounded-full pointer-events-none",
              "transition-opacity duration-100 group-hover:opacity-0 group-focus-within:opacity-0",
              dot.className,
            ].join(" ")}
          />
        )}
      </span>
    </div>
  );
}
