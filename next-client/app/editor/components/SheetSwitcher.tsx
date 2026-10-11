"use client";

import React, { useState } from "react";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi";
import Button from "@/app/components/Button";
import { useSheetNavigation } from "../hooks/use-sheet-navigation";
import { SHEET_LEVEL_CLASSES } from "./sheet-level-classes";
import { isCurrentSheet, SHEET_LEVELS, sheetLabel, type Sheet, type SheetLevel } from "@/app/utils/sheet-nav";

interface SheetSwitcherProps {
  /** The worklog sheet the editor shows (from its file name). */
  sheet: Sheet;
}

const LEVEL_NAME: Record<SheetLevel, string> = { day: "Day", week: "Week", month: "Month" };
const CURRENT_NAME: Record<SheetLevel, string> = { day: "today", week: "this week", month: "this month" };

// One quiet line at the top of a worklog sheet: Day · Week · Month, each with
// its colour, the current level underlined, then ‹ date › to step through
// time at that level. A control with nowhere to go (no daily sheet in the
// week, the future) is disabled. Fades with the rest of the chrome while
// typing.
export default function SheetSwitcher({ sheet }: SheetSwitcherProps) {
  const { openSheet, targets } = useSheetNavigation();
  const [busy, setBusy] = useState(false);
  const to = targets(sheet);
  const isCurrent = isCurrentSheet(sheet, new Date());

  const go = async (level: SheetLevel, date: Date | null) => {
    if (!date || busy) return;
    setBusy(true);
    try {
      await openSheet(level, date);
    } finally {
      setBusy(false);
    }
  };

  const step = LEVEL_NAME[sheet.level].toLowerCase();

  return (
    <nav
      aria-label="Worklog sheets"
      className="typing-chrome mb-4 flex flex-wrap items-center justify-between gap-x-3 font-sans text-ui-caption select-none"
    >
      <div role="group" aria-label="Level" className="flex items-center">
        {SHEET_LEVELS.map((level) => {
          const active = level === sheet.level;
          const classes = SHEET_LEVEL_CLASSES[level];
          return (
            <Button
              key={level}
              variant="bare"
              aria-current={active ? "page" : undefined}
              isDisabled={!active && !to[level]}
              onClick={() => { if (!active) void go(level, to[level]); }}
              className={[
                "relative min-h-11 gap-1.5 px-2.5 active:scale-100",
                "after:absolute after:inset-x-2.5 after:bottom-2 after:h-0.5 after:rounded-full after:transition-opacity",
                classes.underline,
                active ? `${classes.text} after:opacity-100` : "after:opacity-0 hover:after:opacity-40",
              ].join(" ")}
            >
              <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${classes.dot} ${active ? "" : "opacity-60"}`} />
              {LEVEL_NAME[level]}
            </Button>
          );
        })}
      </div>

      <div className="flex items-center text-fg-muted">
        <Button
          variant="bare"
          aria-label={`Previous ${step}`}
          isDisabled={!to.previous}
          onClick={() => void go(sheet.level, to.previous)}
          className="min-h-11 px-1.5"
        >
          <HiChevronLeft size={16} aria-hidden />
        </Button>
        <span className="tabular-nums" aria-live="polite">
          {sheetLabel(sheet)}
          {isCurrent && <span className={`ml-1.5 ${SHEET_LEVEL_CLASSES[sheet.level].text}`}>· {CURRENT_NAME[sheet.level]}</span>}
        </span>
        <Button
          variant="bare"
          aria-label={`Next ${step}`}
          isDisabled={!to.next}
          onClick={() => void go(sheet.level, to.next)}
          className="min-h-11 px-1.5"
        >
          <HiChevronRight size={16} aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
