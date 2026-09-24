"use client";

import React from "react";
import { HiOutlineDocumentText, HiCheck, HiPencilAlt, HiExclamationCircle } from "react-icons/hi";
import { VscClose } from "react-icons/vsc";
import Tooltip from "@/app/components/Tooltip";
import { formatShortcut } from "@/app/utils/platform";

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
  idle: { className: "bg-stone/40 dark:bg-fg-faint/40", title: "Saved" },
  dirty: { className: "bg-amber-500", title: "Unsaved changes" },
  saving: { className: "bg-sage animate-pulse", title: "Saving…" },
  saved: { className: "bg-emerald-500", title: "Saved" },
  error: { className: "bg-red-500", title: "Save error" },
};

// Icon + label version — used where there's room to spell out the state
// explicitly (mobile header, desktop save-status FAB) rather than relying on
// a color-coded dot, which tested as unclear on its own.
export const statusMeta: Record<
  TabSaveState,
  { Icon: React.ComponentType<{ size?: number; className?: string }> | null; className: string; title: string; label: string }
> = {
  idle: { Icon: HiCheck, className: "text-fg-faint", title: "Saved", label: "Saved" },
  dirty: { Icon: HiPencilAlt, className: "text-amber-500", title: "Unsaved changes", label: "Unsaved" },
  saving: { Icon: null, className: "text-sage", title: "Saving…", label: "Saving…" },
  saved: { Icon: HiCheck, className: "text-emerald-500", title: "Saved", label: "Saved" },
  error: { Icon: HiExclamationCircle, className: "text-red-500", title: "Save error", label: "Error" },
};

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
  const showClose = saveState === "idle" || saveState === "saved";

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      onContextMenu={onContextMenu}
      title={fileName}
      className={[
        "group relative flex items-center h-8 px-3 rounded-lg mx-0.5 cursor-pointer shrink-0",
        "min-w-[108px] max-w-[240px] w-fit",
        "select-none transition-[background-color,box-shadow,color,transform] duration-150 border border-transparent",
        isActive
          ? "bg-surface-raised shadow-[0_1px_3px_rgb(0_0_0/0.08)] text-ink-light dark:text-ink-dark"
          : "text-fg-muted hover:bg-surface-raised/60 hover:text-fg dark:text-stone dark:hover:text-ink-dark",
        isDraggedOver ? "ring-2 ring-sage/40 ring-inset" : "",
      ].join(" ")}
    >
      {/* File icon */}
      <HiOutlineDocumentText
        size={14}
        className={[
          "shrink-0 mr-2 transition-colors duration-150",
          isActive ? "text-fg-muted" : "text-fg-faint/70 group-hover:text-fg-muted",
        ].join(" ")}
      />

      {/* File name */}
      <span
        className={[
          "flex-1 truncate text-[12px] leading-none tracking-tight",
          isActive ? "font-medium" : "font-normal",
        ].join(" ")}
      >
        {fileName}
      </span>

      {shortcutNumber && (
        <sup
          aria-hidden="true"
          className="ml-2 mr-0.5 shrink-0 font-mono text-[7px] leading-none text-stone/45 dark:text-fg-faint/50"
        >
          {formatShortcut(String(shortcutNumber))}
        </sup>
      )}

      {/* Right slot: status dot OR close button */}
      <span className="ml-1.5 shrink-0 flex items-center justify-center w-3.5 h-3.5">
        {dot && !showClose ? (
          /* Status dot — replaces close when dirty/saving */
          <span
            className={`block w-1.5 h-1.5 rounded-full ${dot.className}`}
            title={saveState === "error" ? (saveErrorMessage || dot.title) : dot.title}
          />
        ) : (
          /* Close button — contained within the slot, never overflows the tab */
          <Tooltip label="Close tab" position="bottom">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close tab"
              className={[
                "flex items-center justify-center w-4 h-4 rounded-full",
                "text-fg-faint hover:text-fg dark:text-stone dark:hover:text-ink-dark",
                "hover:bg-surface-raised",
                "transition-all duration-100",
                isActive
                  ? "opacity-60 hover:opacity-100"
                  : "opacity-0 group-hover:opacity-50 hover:!opacity-100",
              ].join(" ")}
            >
              <VscClose size={10} />
            </button>
          </Tooltip>
        )}
      </span>
    </div>
  );
}
