"use client";

import React from "react";
import { HiOutlineDocumentText } from "react-icons/hi";
import { VscClose } from "react-icons/vsc";

export type TabSaveState = "idle" | "dirty" | "saving" | "saved" | "error";

interface PaneTabProps {
  fileName: string;
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

const statusDot: Record<TabSaveState, { className: string; title: string } | null> = {
  idle: null,
  dirty: { className: "bg-sage/80", title: "Unsaved changes" },
  saving: { className: "bg-sage animate-pulse", title: "Saving…" },
  saved: { className: "bg-emerald-500", title: "Saved" },
  error: { className: "bg-red-500", title: "Save error" },
};

export default function PaneTab({
  fileName,
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
        "group relative flex items-center h-[38px] md:h-[26px] px-3 md:px-2 rounded-md mx-[2px] md:mx-[1px] cursor-pointer shrink-0",
        "min-w-[80px] md:min-w-[64px] max-w-[160px] md:max-w-[130px]",
        "select-none transition-all duration-150 hover:scale-[1.01] active:scale-[0.99]",
        isActive
          ? "bg-paper-light/80 dark:bg-paper-dark-surface/80 border border-edge-subtle text-ink-light dark:text-ink-dark"
          : "text-stone hover:text-ink-muted dark:hover:text-stone hover:bg-paper-light/30 dark:hover:bg-paper-dark-surface/20",
        isDraggedOver ? "ring-2 ring-sage/40 ring-inset" : "",
      ].join(" ")}
    >
      {/* File icon */}
      <HiOutlineDocumentText
        size={14}
        className={[
          "md:w-[11px] md:h-[11px] shrink-0 mr-2 md:mr-1 transition-colors duration-150",
          isActive ? "text-sage/80" : "text-stone/40 group-hover:text-stone/60",
        ].join(" ")}
      />

      {/* File name */}
      <span
        className={[
          "flex-1 truncate text-[13px] md:text-[10px] leading-none tracking-tight",
          isActive ? "font-medium text-ink-light dark:text-ink-dark" : "font-normal",
        ].join(" ")}
      >
        {fileName}
      </span>

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
          <button
            type="button"
            onClick={onClose}
            aria-label="Close tab"
            title="Close tab"
            className={[
              "flex items-center justify-center w-3.5 h-3.5 rounded-full",
              "text-stone hover:text-ink-light dark:hover:text-ink-dark",
              "hover:bg-beige/80 dark:hover:bg-clay/60",
              "transition-all duration-100",
              isActive
                ? "opacity-60 hover:opacity-100"
                : "opacity-0 group-hover:opacity-50 hover:!opacity-100",
            ].join(" ")}
          >
            <VscClose size={10} />
          </button>
        )}
      </span>
    </div>
  );
}
