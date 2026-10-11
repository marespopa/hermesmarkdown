"use client";

import { useCallback, useMemo } from "react";
import { useAtomValue } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { dailySheetDates, levelTarget, stepTarget, type Sheet, type SheetLevel } from "@/app/utils/sheet-nav";
import { useRollups } from "./use-rollups";

// Opens worklog sheets for the sheet switcher: a day through Today's sheet
// (created when it's today and missing), a week, month, quarter or year through the rollups
// (generated when missing). `targets` works out where each control leads,
// from the vault's daily sheets, so the switcher can disable dead ends.
export function useSheetNavigation() {
  const metadata = useAtomValue(atom_fileMetadata);
  const dates = useMemo(() => dailySheetDates(Object.keys(metadata)), [metadata]);
  const { openTodayNote } = useFileSystem();
  const { openRollup } = useRollups();

  const openSheet = useCallback(async (level: SheetLevel, date: Date) => {
    if (level === "day") await openTodayNote(date);
    else await openRollup({ kind: level, offset: 0 }, date);
  }, [openTodayNote, openRollup]);

  const targets = useCallback((sheet: Sheet, today: Date = new Date()) => {
    return {
      day: levelTarget(sheet, "day", today, dates),
      week: levelTarget(sheet, "week", today, dates),
      month: levelTarget(sheet, "month", today, dates),
      quarter: levelTarget(sheet, "quarter", today, dates),
      year: levelTarget(sheet, "year", today, dates),
      previous: stepTarget(sheet, -1, today, dates),
      next: stepTarget(sheet, 1, today, dates),
    };
  }, [dates]);

  return { openSheet, targets };
}
