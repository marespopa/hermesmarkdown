"use client";

import Button from "@/app/components/Button";
import { SHEET_LEVELS, type SheetLevel } from "@/app/utils/sheet-nav";
import { SHEET_LEVEL_CLASSES } from "../sheet-level-classes";

interface FeedSheetsProps {
  /** Opens today's sheet or the current week's, month's, quarter's or year's, creating it when missing. */
  onOpenSheet: (level: SheetLevel) => void;
}

const LABEL: Record<SheetLevel, string> = {
  day: "Today",
  week: "This week",
  month: "This month",
  quarter: "This quarter",
  year: "This year",
};

// The worklog's levels under the stats line, each with its colour dot:
// "Today · This week · This month · This quarter · This year". The way into
// the periodic sheets without the palette.
export default function FeedSheets({ onOpenSheet }: FeedSheetsProps) {
  return (
    <nav aria-label="Worklog sheets" className="mt-1 flex flex-wrap items-center gap-x-1 text-ui-footnote text-fg-muted">
      {SHEET_LEVELS.map((level, index) => (
        <span key={level} className="inline-flex items-center gap-x-1">
          {index > 0 && <span aria-hidden className="text-fg-faint">·</span>}
          <Button
            variant="unstyled"
            onClick={() => onOpenSheet(level)}
            className="inline-flex min-h-8 items-center gap-1.5 rounded px-1 transition-colors hover:text-fg"
          >
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${SHEET_LEVEL_CLASSES[level].dot}`} />
            {LABEL[level]}
          </Button>
        </span>
      ))}
    </nav>
  );
}
