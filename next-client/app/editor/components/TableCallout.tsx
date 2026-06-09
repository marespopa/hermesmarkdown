"use client";

import React, { useState } from "react";
import Button from "../../components/Button";
import { PILL_CONTAINER_CLASSES } from "./constants";

interface TableCalloutProps {
  pos: { top: number; left: number };
  onRemoveTable: () => void;
  onCopyCSV: () => void;
  onEditDialog: () => void;
}

export function TableCallout({
  pos,
  onRemoveTable,
  onCopyCSV,
  onEditDialog,
}: TableCalloutProps) {
  const [pendingDelete, setPendingDelete] = useState(false);

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
          <div className="w-px h-4 bg-beige dark:bg-clay mx-0.5" />
          <Button variant="pill-icon" className="px-2 text-ui-micro font-medium" onClick={() => setPendingDelete(false)} title="Cancel">
            Cancel
          </Button>
          <Button variant="pill-icon" className="px-2 text-ui-micro font-medium text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300" onClick={() => { onRemoveTable(); setPendingDelete(false); }} title="Confirm delete">
            Delete
          </Button>
        </>
      ) : (
        <>
          <Button variant="pill-icon" className="px-2 text-ui-micro font-medium" onClick={onEditDialog} title="Edit table">
            Edit
          </Button>
          <div className="w-px h-4 bg-beige dark:bg-clay mx-0.5" />
          <Button variant="pill-icon" className="px-2 text-ui-micro font-medium text-ink-muted dark:text-stone hover:text-red-500 dark:hover:text-red-400 transition-colors" onClick={() => setPendingDelete(true)} title="Delete table">
            ×Table
          </Button>
          <div className="w-px h-4 bg-beige dark:bg-clay mx-0.5" />
          <Button variant="pill-icon" className="px-2 text-ui-micro font-medium" onClick={onCopyCSV} title="Copy as CSV">
            CSV
          </Button>
        </>
      )}
    </div>
  );
}
