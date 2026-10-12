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
  /** Called with the level being opened, then `null` once it's open (or failed). */
  onPendingChange?: (level: SheetLevel | null) => void;
}

const LEVEL_NAME: Record<SheetLevel, string> = { day: "Day", week: "Week", month: "Month", quarter: "Quarter", year: "Year" };
const CURRENT_NAME: Record<SheetLevel, string> = {
  day: "today",
  week: "this week",
  month: "this month",
  quarter: "this quarter",
  year: "this year",
};

// One quiet line at the top of a worklog sheet: Day · Week · Month · Quarter ·
// Year, each with its colour, the current level underlined, then ‹ date › to
// step through time at that level. A control with nowhere to go (no daily
// sheet in the week, the future) is disabled. Fades with the rest of the
// chrome while typing. Opening a sheet can take a moment (a folder prompt, a
// template's questions), so a tapped level takes the underline at once (pulsing) and `onPendingChange` lets the editor cover
// the old text with a skeleton until the new sheet is open.
export default function SheetSwitcher({ sheet, onPendingChange }: SheetSwitcherProps) {
  const { openSheet, targets } = useSheetNavigation();
  const [pending, setPending] = useState<SheetLevel | null>(null);
  const to = targets(sheet);
  const isCurrent = isCurrentSheet(sheet, new Date());
  const shownLevel = pending ?? sheet.level;

  const go = async (level: SheetLevel, date: Date | null) => {
    if (!date || pending) return;
    setPending(level);
    onPendingChange?.(level);
    try {
      await openSheet(level, date);
    } catch (err) {
      console.warn("Sheet switcher: couldn't open the sheet", err);
    } finally {
      setPending(null);
      onPendingChange?.(null);
    }
  };

  const step = LEVEL_NAME[sheet.level].toLowerCase();

  return (
    <nav
      aria-label="Worklog sheets"
      aria-busy={pending ? true : undefined}
      className="typing-chrome mb-4 flex flex-wrap items-center justify-between gap-x-3 font-sans text-ui-caption select-none"
    >
      <div role="group" aria-label="Level" className="flex items-center">
        {SHEET_LEVELS.map((level) => {
          const active = level === sheet.level;
          const shown = level === shownLevel;
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
                shown ? `${classes.text} after:opacity-100` : "after:opacity-0 hover:after:opacity-40",
                pending === level ? "motion-safe:after:animate-pulse" : "",
              ].join(" ")}
            >
              <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${classes.dot} ${shown ? "" : "opacity-60"}`} />
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
        <span className={`tabular-nums ${pending ? "motion-safe:animate-pulse motion-reduce:opacity-50" : ""}`} aria-live="polite">
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
