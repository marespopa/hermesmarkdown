"use client";

import React, { useState, useEffect, useRef } from "react";
import { HiChevronRight, HiOutlineDotsVertical } from "react-icons/hi";
import Button from "../../components/Button";
import { PILL_CONTAINER_CLASSES } from "./constants";

const ALIGN_LABELS: Record<string, string> = {
  left: "L",
  center: "C",
  right: "R",
  none: "—",
};

interface TableCalloutProps {
  pos: { top: number; left: number };
  isMobile: boolean;
  isOnHeader: boolean;
  currentAlignment: string;
  canRemoveRow: boolean;
  canRemoveCol: boolean;
  cursorDataRowNumber: number;
  onAddRow: () => void;
  onRemoveRow: () => void;
  onAddColumn: () => void;
  onRemoveColumn: () => void;
  onSortAsc: () => void;
  onSortDesc: () => void;
  onCycleAlign: () => void;
  onRemoveTable: () => void;
  onCopyCSV: () => void;
  onEditDialog: () => void;
}

function PillBtn({
  children,
  onClick,
  disabled,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  danger?: boolean;
}) {
  return (
    <Button
      variant="pill-icon"
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`px-2 text-ui-micro font-medium ${danger ? "text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300" : ""}`}
    >
      {children}
    </Button>
  );
}

function Sep() {
  return <div className="w-px h-4 bg-beige dark:bg-clay mx-0.5" />;
}

// Grabbing this handle repositions the whole callout via a translate offset
// (see dragOffset below) rather than moving it into normal flow, so it can
// be dropped anywhere without disturbing the coords computed from the
// cursor/caret position.
function DragHandle({ onPointerDown }: { onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void }) {
  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      title="Drag to move"
      className="flex items-center justify-center w-5 h-6 shrink-0 text-stone/60 hover:text-stone cursor-grab active:cursor-grabbing touch-none"
    >
      <HiOutlineDotsVertical size={13} />
    </button>
  );
}

export function TableCallout({
  pos,
  isMobile,
  isOnHeader,
  currentAlignment,
  canRemoveRow,
  canRemoveCol,
  cursorDataRowNumber,
  onAddRow,
  onRemoveRow,
  onAddColumn,
  onRemoveColumn,
  onSortAsc,
  onSortDesc,
  onCycleAlign,
  onRemoveTable,
  onCopyCSV,
  onEditDialog,
}: TableCalloutProps) {
  const [expanded, setExpanded] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);

  useEffect(() => {
    if (isOnHeader) setExpanded(true);
  }, [isOnHeader]);

  // The base `pos` is recomputed by the caller every time the caret moves,
  // so a drag offset needs to reset whenever that happens — otherwise a
  // drag from an earlier cell would keep displacing the toolbar forever.
  // Tracking the previous `pos` lets us tell "caret moved, recompute" apart
  // from "we're the ones who just changed position by dragging."
  const [dragOffset, setDragOffset] = useState({ top: 0, left: 0 });
  const prevPosRef = useRef(pos);
  const draggingRef = useRef<{ startX: number; startY: number; startTop: number; startLeft: number } | null>(null);

  useEffect(() => {
    if (pos.top !== prevPosRef.current.top || pos.left !== prevPosRef.current.left) {
      prevPosRef.current = pos;
      if (!draggingRef.current) setDragOffset({ top: 0, left: 0 });
    }
  }, [pos]);

  const handleDragPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTop: dragOffset.top,
      startLeft: dragOffset.left,
    };

    const handleMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      setDragOffset({
        top: draggingRef.current.startTop + (ev.clientY - draggingRef.current.startY),
        left: draggingRef.current.startLeft + (ev.clientX - draggingRef.current.startX),
      });
    };
    const handleUp = () => {
      draggingRef.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const style = { top: pos.top + dragOffset.top, left: pos.left + dragOffset.left };

  if (isMobile) {
    return (
      <div
        style={style}
        className={`${PILL_CONTAINER_CLASSES} gap-0.5`}
        onMouseDown={(e) => e.preventDefault()}
      >
        <DragHandle onPointerDown={handleDragPointerDown} />
        <Sep />
        {pendingDelete ? (
          <>
            <span className="px-2 text-ui-micro font-medium text-red-500 dark:text-red-400 select-none">
              Delete table?
            </span>
            <Sep />
            <PillBtn onClick={() => setPendingDelete(false)}>Cancel</PillBtn>
            <PillBtn danger onClick={() => { onRemoveTable(); setPendingDelete(false); }}>Delete</PillBtn>
          </>
        ) : (
          <>
            <PillBtn onClick={onEditDialog} title="Edit table">Edit</PillBtn>
            <Sep />
            <PillBtn danger onClick={() => setPendingDelete(true)} title="Delete table">×</PillBtn>
            <PillBtn onClick={onCopyCSV} title="Copy as CSV">CSV</PillBtn>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      style={style}
      className={`${PILL_CONTAINER_CLASSES} gap-0.5`}
      onMouseDown={(e) => e.preventDefault()}
    >
      <DragHandle onPointerDown={handleDragPointerDown} />
      {pendingDelete ? (
        <>
          <Sep />
          <span className="px-2 text-ui-micro font-medium text-red-500 dark:text-red-400 select-none">
            Delete table?
          </span>
          <Sep />
          <PillBtn onClick={() => setPendingDelete(false)}>Cancel</PillBtn>
          <PillBtn danger onClick={() => { onRemoveTable(); setPendingDelete(false); }}>Delete</PillBtn>
        </>
      ) : (
        <>
          <Sep />
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Collapse toolbar" : "Expand table toolbar"}
            className="flex items-center justify-center w-6 h-6 rounded text-stone hover:text-ink-light dark:hover:text-ink-dark transition-colors"
          >
            <HiChevronRight
              size={13}
              className={`transition-transform duration-200 ${expanded ? "rotate-180" : "rotate-0"}`}
            />
          </button>

          {expanded && (
            <>
              <Sep />
              <PillBtn onClick={onAddRow} title="Add row below">+Row</PillBtn>
              {canRemoveRow && (
                <PillBtn
                  onClick={onRemoveRow}
                  title={`Remove row ${cursorDataRowNumber}`}
                  danger
                >
                  −Row {cursorDataRowNumber}
                </PillBtn>
              )}
              <Sep />
              <PillBtn onClick={onAddColumn} title="Add column to the right">+Col</PillBtn>
              <PillBtn onClick={onRemoveColumn} disabled={!canRemoveCol} title="Remove current column" danger>−Col</PillBtn>
              {isOnHeader && (
                <>
                  <Sep />
                  <PillBtn onClick={onSortAsc} title="Sort column A → Z">↑</PillBtn>
                  <PillBtn onClick={onSortDesc} title="Sort column Z → A">↓</PillBtn>
                </>
              )}
              <Sep />
              <PillBtn onClick={onCycleAlign} title={`Alignment: ${currentAlignment} — click to cycle`}>
                {ALIGN_LABELS[currentAlignment] ?? "—"}
              </PillBtn>
              <Sep />
            </>
          )}

          <Sep />
          <PillBtn onClick={onCopyCSV} title="Copy as CSV">CSV</PillBtn>
          <PillBtn danger onClick={() => setPendingDelete(true)} title="Delete table">×</PillBtn>
        </>
      )}
    </div>
  );
}
