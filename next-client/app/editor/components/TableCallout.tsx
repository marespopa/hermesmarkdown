"use client";

import React, { useState, useEffect } from "react";
import { HiChevronRight } from "react-icons/hi";
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

  if (isMobile) {
    return (
      <div
        style={{ top: pos.top, left: pos.left }}
        className={`${PILL_CONTAINER_CLASSES} gap-0.5`}
        onMouseDown={(e) => e.preventDefault()}
      >
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
      style={{ top: pos.top, left: pos.left }}
      className={`${PILL_CONTAINER_CLASSES} gap-0.5`}
      onMouseDown={(e) => e.preventDefault()}
    >
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
