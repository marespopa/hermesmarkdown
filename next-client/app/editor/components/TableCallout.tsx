"use client";

import React, { useState } from "react";
import Button from "../../components/Button";
import { PILL_CONTAINER_CLASSES } from "./constants";

interface TableEdgeButtonsProps {
  addRowPos: { top: number; left: number } | null;
  addColPos: { top: number; left: number } | null;
  onAddRow: () => void;
  onAddCol: () => void;
}

const EDGE_BTN =
  "absolute z-40 w-11 h-11 text-sm border border-dashed border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 pointer-events-auto";

export function TableEdgeButtons({
  addRowPos,
  addColPos,
  onAddRow,
  onAddCol,
}: TableEdgeButtonsProps) {
  return (
    <>
      {addRowPos && (
        <Button
          variant="icon"
          style={{ top: addRowPos.top, left: addRowPos.left }}
          className={EDGE_BTN}
          onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
          onClick={onAddRow}
          title="Add row"
          aria-label="Add row"
        >
          +
        </Button>
      )}
      {addColPos && (
        <Button
          variant="icon"
          style={{ top: addColPos.top, left: addColPos.left }}
          className={EDGE_BTN}
          onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
          onClick={onAddCol}
          title="Add column"
          aria-label="Add column"
        >
          +
        </Button>
      )}
    </>
  );
}

interface TableCalloutProps {
  pos: { top: number; left: number };
  onRemoveRow: () => void;
  onRemoveCol: () => void;
  onRemoveTable: () => void;
  onCopyCSV: () => void;
  onEditDialog: () => void;
}

type PendingDelete = "row" | "col" | "table" | null;

const PENDING_LABELS: Record<NonNullable<PendingDelete>, string> = {
  row: "Delete row?",
  col: "Delete column?",
  table: "Delete table?",
};

const DESTRUCTIVE = "px-2 text-ui-micro font-medium text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors";

export function TableCallout({
  pos,
  onRemoveRow,
  onRemoveCol,
  onRemoveTable,
  onCopyCSV,
  onEditDialog,
}: TableCalloutProps) {
  const [pending, setPending] = useState<PendingDelete>(null);

  const confirm = () => {
    if (pending === "row") onRemoveRow();
    else if (pending === "col") onRemoveCol();
    else if (pending === "table") onRemoveTable();
    setPending(null);
  };

  return (
    <div
      style={{ top: pos.top, left: pos.left }}
      className={`${PILL_CONTAINER_CLASSES} gap-0.5`}
      onMouseDown={(e) => e.preventDefault()}
    >
      {pending ? (
        <>
          <span className="px-2 text-ui-micro font-medium text-red-500 dark:text-red-400 select-none">
            {PENDING_LABELS[pending]}
          </span>
          <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-0.5" />
          <Button variant="pill-icon" className="px-2 text-ui-micro font-medium" onClick={() => setPending(null)} title="Cancel">
            Cancel
          </Button>
          <Button variant="pill-icon" className="px-2 text-ui-micro font-medium text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300" onClick={confirm} title="Confirm delete">
            Delete
          </Button>
        </>
      ) : (
        <>
          <Button variant="pill-icon" className="px-2 text-ui-micro font-medium" onClick={onEditDialog} title="Edit table">
            Edit
          </Button>
          <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-0.5" />
          <Button variant="pill-icon" className={DESTRUCTIVE} onClick={() => setPending("row")} title="Delete row">
            ×Row
          </Button>
          <Button variant="pill-icon" className={DESTRUCTIVE} onClick={() => setPending("col")} title="Delete column">
            ×Col
          </Button>
          <Button variant="pill-icon" className={DESTRUCTIVE} onClick={() => setPending("table")} title="Delete table">
            ×Table
          </Button>
          <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-0.5" />
          <Button variant="pill-icon" className="px-2 text-ui-micro font-medium" onClick={onCopyCSV} title="Copy as CSV">
            CSV
          </Button>
        </>
      )}
    </div>
  );
}
