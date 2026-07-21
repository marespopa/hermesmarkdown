"use client";

import React, { useState, useEffect, useRef } from "react";
import { HiChevronRight, HiChevronDown, HiOutlineDotsVertical } from "react-icons/hi";
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
  fullWidth,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  danger?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <Button
      variant="pill-icon"
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${fullWidth ? "w-full justify-start" : ""} px-2 text-ui-micro font-medium ${danger ? "text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300" : ""}`}
    >
      {children}
    </Button>
  );
}

function Sep() {
  return <div className="w-px h-4 bg-beige dark:bg-clay mx-0.5" />;
}

function HSep() {
  return <div className="h-px w-full bg-beige dark:bg-clay my-0.5" />;
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

// A labeled, individually collapsible group within the vertical toolbar
// (Rows / Columns / Sort / Align) — keeps the panel short by default even
// though it now grows down instead of sideways.
function Section({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1 w-full h-6 px-1 rounded text-ui-micro font-medium text-ink-muted dark:text-stone hover:text-ink-light dark:hover:text-ink-dark transition-colors"
      >
        <HiChevronRight
          size={11}
          className={`transition-transform duration-150 ${open ? "rotate-90" : "rotate-0"}`}
        />
        {label}
      </button>
      {open && <div className="flex flex-col gap-0.5 pl-3 pb-0.5">{children}</div>}
    </div>
  );
}

type SectionKey = "rows" | "columns" | "sort" | "align";

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
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    rows: false,
    columns: false,
    sort: false,
    align: false,
  });
  const toggleSection = (key: SectionKey) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    if (isOnHeader) {
      setExpanded(true);
      setOpenSections((prev) => (prev.sort ? prev : { ...prev, sort: true }));
    }
  }, [isOnHeader]);

  // The base `pos` is recomputed by the caller every time the caret moves,
  // so a drag offset needs to reset whenever that happens — otherwise a
  // drag from an earlier cell would keep displacing the toolbar forever.
  // Tracking the previous `pos` lets us tell "caret moved, recompute" apart
  // from "we're the ones who just changed position by dragging."
  const [dragOffset, setDragOffset] = useState({ top: 0, left: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const prevPosRef = useRef(pos);
  const dragElRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{ startX: number; startY: number; startTop: number; startLeft: number } | null>(null);

  useEffect(() => {
    if (pos.top !== prevPosRef.current.top || pos.left !== prevPosRef.current.left) {
      prevPosRef.current = pos;
      if (!draggingRef.current) setDragOffset({ top: 0, left: 0 });
    }
  }, [pos]);

  // Dragging used to call setDragOffset on every single pointermove, which
  // re-renders this whole toolbar (all its Sections/PillBtns) once per pixel
  // of mouse movement, AND the container's own `transition-all duration-200`
  // (meant for the expand/collapse animation) was catching those top/left
  // changes too — so the pill visibly eased toward the cursor over 200ms
  // instead of tracking it, reading as laggy/"clunky". Fixed by writing
  // position directly to the DOM node during the drag (no re-render at all
  // until pointerup commits the final offset once) and suppressing the
  // transition class for the duration of the drag.
  const handleDragPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    draggingRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTop: dragOffset.top,
      startLeft: dragOffset.left,
    };

    const handleMove = (ev: PointerEvent) => {
      const drag = draggingRef.current;
      if (!drag || !dragElRef.current) return;
      const top = drag.startTop + (ev.clientY - drag.startY);
      const left = drag.startLeft + (ev.clientX - drag.startX);
      dragElRef.current.style.top = `${pos.top + top}px`;
      dragElRef.current.style.left = `${pos.left + left}px`;
    };
    const handleUp = (ev: PointerEvent) => {
      const drag = draggingRef.current;
      draggingRef.current = null;
      setIsDragging(false);
      if (drag) {
        setDragOffset({
          top: drag.startTop + (ev.clientY - drag.startY),
          left: drag.startLeft + (ev.clientX - drag.startX),
        });
      }
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
        ref={dragElRef}
        style={style}
        className={`${PILL_CONTAINER_CLASSES} gap-0.5 ${isDragging ? "!transition-none" : ""}`}
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
      ref={dragElRef}
      style={style}
      className={`absolute z-40 flex flex-col gap-0.5 p-1 w-36 bg-paper-light dark:bg-paper-dark border border-edge rounded-md shadow-sm pointer-events-auto select-none ${isDragging ? "" : "transition-all duration-200 ease-in-out"}`}
      onMouseDown={(e) => e.preventDefault()}
    >
      {pendingDelete ? (
        <>
          <span className="px-2 py-1 text-ui-micro font-medium text-red-500 dark:text-red-400 select-none">
            Delete table?
          </span>
          <div className="flex gap-0.5">
            <PillBtn onClick={() => setPendingDelete(false)}>Cancel</PillBtn>
            <PillBtn danger onClick={() => { onRemoveTable(); setPendingDelete(false); }}>Delete</PillBtn>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-0.5">
            <DragHandle onPointerDown={handleDragPointerDown} />
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? "Collapse toolbar" : "Expand table toolbar"}
              className="flex flex-1 items-center justify-center h-6 rounded text-stone hover:text-ink-light dark:hover:text-ink-dark transition-colors"
            >
              <HiChevronDown
                size={13}
                className={`transition-transform duration-200 ${expanded ? "rotate-180" : "rotate-0"}`}
              />
            </button>
          </div>

          {expanded && (
            <>
              <HSep />

              <Section label="Rows" open={openSections.rows} onToggle={() => toggleSection("rows")}>
                <PillBtn fullWidth onClick={onAddRow} title="Add row below">+ Row</PillBtn>
                {canRemoveRow && (
                  <PillBtn
                    fullWidth
                    onClick={onRemoveRow}
                    title={`Remove row ${cursorDataRowNumber}`}
                    danger
                  >
                    − Row {cursorDataRowNumber}
                  </PillBtn>
                )}
              </Section>

              <Section label="Columns" open={openSections.columns} onToggle={() => toggleSection("columns")}>
                <PillBtn fullWidth onClick={onAddColumn} title="Add column to the right">+ Col</PillBtn>
                <PillBtn fullWidth onClick={onRemoveColumn} disabled={!canRemoveCol} title="Remove current column" danger>− Col</PillBtn>
              </Section>

              {isOnHeader && (
                <Section label="Sort" open={openSections.sort} onToggle={() => toggleSection("sort")}>
                  <PillBtn fullWidth onClick={onSortAsc} title="Sort column A → Z">↑ A → Z</PillBtn>
                  <PillBtn fullWidth onClick={onSortDesc} title="Sort column Z → A">↓ Z → A</PillBtn>
                </Section>
              )}

              <Section label={`Align: ${ALIGN_LABELS[currentAlignment] ?? "—"}`} open={openSections.align} onToggle={() => toggleSection("align")}>
                <PillBtn fullWidth onClick={onCycleAlign} title={`Alignment: ${currentAlignment} — click to cycle`}>
                  Cycle ({ALIGN_LABELS[currentAlignment] ?? "—"})
                </PillBtn>
              </Section>

              <HSep />
            </>
          )}

          <div className="flex gap-0.5">
            <PillBtn fullWidth onClick={onCopyCSV} title="Copy as CSV">CSV</PillBtn>
            <PillBtn danger onClick={() => setPendingDelete(true)} title="Delete table">×</PillBtn>
          </div>
        </>
      )}
    </div>
  );
}
