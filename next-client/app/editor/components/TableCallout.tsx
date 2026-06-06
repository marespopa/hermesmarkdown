"use client";

import React from "react";
import Button from "../../components/Button";
import { PILL_CONTAINER_CLASSES } from "./constants";

type Alignment = "none" | "left" | "center" | "right";

const ALIGN_LABEL: Record<Alignment, string> = {
  none: "—",
  left: "L",
  center: "C",
  right: "R",
};

interface TableCalloutProps {
  pos: { top: number; left: number };
  currentAlignment: Alignment;
  onAddRow: () => void;
  onAddCol: () => void;
  onRemoveRow: () => void;
  onRemoveCol: () => void;
  onCycleAlign: () => void;
  onCopyCSV: () => void;
}

export function TableCallout({
  pos,
  currentAlignment,
  onAddRow,
  onAddCol,
  onRemoveRow,
  onRemoveCol,
  onCycleAlign,
  onCopyCSV,
}: TableCalloutProps) {
  return (
    <div
      style={{ top: pos.top, left: pos.left }}
      className={`${PILL_CONTAINER_CLASSES} gap-0.5`}
      onMouseDown={(e) => e.preventDefault()}
    >
      <Button variant="pill-icon" className="px-2 text-ui-micro font-medium" onClick={onAddRow} title="Add row">
        +Row
      </Button>
      <Button variant="pill-icon" className="px-2 text-ui-micro font-medium" onClick={onAddCol} title="Add column">
        +Col
      </Button>
      <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-0.5" />
      <Button variant="pill-icon" className="px-2 text-ui-micro font-medium" onClick={onRemoveRow} title="Delete row">
        ×Row
      </Button>
      <Button variant="pill-icon" className="px-2 text-ui-micro font-medium" onClick={onRemoveCol} title="Delete column">
        ×Col
      </Button>
      <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-0.5" />
      <Button
        variant="pill-icon"
        className="px-2 text-ui-micro font-medium min-w-[1.75rem]"
        onClick={onCycleAlign}
        title="Cycle column alignment"
      >
        {ALIGN_LABEL[currentAlignment]}
      </Button>
      <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-0.5" />
      <Button variant="pill-icon" className="px-2 text-ui-micro font-medium" onClick={onCopyCSV} title="Copy as CSV">
        CSV
      </Button>
    </div>
  );
}
