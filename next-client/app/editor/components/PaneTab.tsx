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
  dirty: { className: "bg-blue-400/80", title: "Unsaved changes" },
  saving: { className: "bg-blue-500 animate-pulse", title: "Saving…" },
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
        "group relative flex items-center h-[30px] px-2.5 rounded-lg mx-[2px] cursor-pointer shrink-0",
        "min-w-[90px] md:min-w-[120px] max-w-[180px]",
        "select-none transition-all duration-150",
        isActive
          ? "bg-white dark:bg-zinc-800 shadow-[0_1px_4px_rgba(0,0,0,0.08),0_0_0_0.5px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.3),0_0_0_0.5px_rgba(255,255,255,0.04)] text-zinc-900 dark:text-zinc-100"
          : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-white/50 dark:hover:bg-zinc-800/40",
        isDraggedOver ? "ring-2 ring-blue-400/60 ring-inset" : "",
      ].join(" ")}
    >
      {/* File icon */}
      <HiOutlineDocumentText
        size={12}
        className={[
          "shrink-0 mr-1.5 transition-colors duration-150",
          isActive ? "text-blue-500" : "text-zinc-400/60 group-hover:text-zinc-400",
        ].join(" ")}
      />

      {/* File name */}
      <span
        className={[
          "flex-1 truncate text-[11px] leading-none tracking-tight",
          isActive ? "font-medium text-zinc-800 dark:text-zinc-100" : "font-normal",
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
              "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200",
              "hover:bg-zinc-200/80 dark:hover:bg-zinc-600/60",
              "transition-all duration-100",
              isActive
                ? "opacity-0 group-hover:opacity-60 hover:!opacity-100"
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
