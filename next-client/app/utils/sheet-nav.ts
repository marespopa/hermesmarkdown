// Moving between worklog sheets: daily (`2026-10-11.md`), weekly
// (`2026-W41.md`), monthly (`2026-10.md`), quarterly (`2026-Q4.md`) and
// yearly (`2026-year.md`). Pure: every function takes
// `today` and the dates that have a daily sheet, and returns the date to open
// at a level, or null when there is nowhere to go. Never past today, and a
// day is only ever today or a day that already has a sheet, so moving around
// never creates empty past sheets.

import { todayNoteName } from "./today-note";
import { parsePeriodName, periodOf, weekPeriod, type Period } from "./periods/period";

export type SheetLevel = "day" | "week" | "month" | "quarter" | "year";

export const SHEET_LEVELS: SheetLevel[] = ["day", "week", "month", "quarter", "year"];

export interface Sheet {
  level: SheetLevel;
  start: Date; // local midnight, first day
  end: Date; // local midnight, last day (inclusive)
  period?: Period; // every level but day
}

const REGEX_DAY_NAME = /^(\d{4})-(\d{2})-(\d{2})\.md$/;
const midnight = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const fmt = (date: Date, options: Intl.DateTimeFormatOptions) => date.toLocaleDateString(undefined, options);

// The sheet a file name stands for, or null when it isn't one.
export function parseSheetName(fileName: string): Sheet | null {
  const day = REGEX_DAY_NAME.exec(fileName);
  if (day) {
    const date = new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]));
    // Rejects 2026-02-31 and the like, which Date would roll over.
    if (todayNoteName(date) !== fileName.slice(0, -3)) return null;
    return { level: "day", start: date, end: date };
  }
  const period = parsePeriodName(fileName);
  return period ? { level: period.kind, start: period.start, end: period.end, period } : null;
}

// "Sat, Oct 11", "Week 41 · Oct 5 – 11", "October 2026", "Q4 2026 · October – December", "2026".
export function sheetLabel(sheet: Sheet): string {
  if (sheet.level === "day") return fmt(sheet.start, { weekday: "short", month: "short", day: "numeric" });
  const heading = sheet.period!.heading;
  // Weekly headings end in the year; the switcher keeps them short.
  return sheet.level === "week" ? heading.replace(/,\s*\d{4}$/, "") : heading;
}

const inSheet = (sheet: Sheet, date: Date) => date >= sheet.start && date <= sheet.end;

// The latest day with a sheet inside [start, end], or null.
function latestSheetDay(start: Date, end: Date, dailyDates: Iterable<string>): Date | null {
  const from = todayNoteName(start);
  const to = todayNoteName(end);
  let best: string | null = null;
  for (const name of dailyDates) {
    if (name >= from && name <= to && (!best || name > best)) best = name;
  }
  return best ? parseSheetName(`${best}.md`)!.start : null;
}

// The date to open at `level` from `sheet`: the same day, or the period
// holding it. Going up uses the sheet's anchor (a week belongs to its
// Thursday's month, quarter and year). Going down lands on today when it's
// inside; else, in a past sheet, on its latest day with a sheet (null when
// there is none) or the last week / month / quarter it owns. Nothing below a
// sheet in the future.
export function levelTarget(sheet: Sheet, level: SheetLevel, today: Date, dailyDates: Iterable<string>): Date | null {
  const now = midnight(today);
  if (sheet.level === level) return sheet.start;
  if (sheet.level === "day") return sheet.start;
  if (SHEET_LEVELS.indexOf(level) > SHEET_LEVELS.indexOf(sheet.level)) return sheet.period!.anchor;
  if (inSheet(sheet, now)) return now;
  if (sheet.start > now) return null;
  if (level === "day") return latestSheetDay(sheet.start, sheet.end, dailyDates);
  if (level === "week") {
    // The week holding the last day, or the one before when its Thursday is past the end.
    const week = weekPeriod(sheet.end);
    return week.anchor > sheet.end ? weekPeriod(sheet.end, -1).anchor : week.anchor;
  }
  return periodOf(level, sheet.end).start;
}

// The date to open one step back (-1) or forward (1) at the sheet's level.
// Days skip to the nearest day with a sheet; forward from the latest one is
// today. Other levels move by one and stop at the current one.
export function stepTarget(sheet: Sheet, direction: -1 | 1, today: Date, dailyDates: Iterable<string>): Date | null {
  const now = midnight(today);
  if (sheet.level === "day") {
    const from = todayNoteName(sheet.start);
    const limit = todayNoteName(now);
    let best: string | null = null;
    for (const name of dailyDates) {
      if (direction < 0 ? name < from && (!best || name > best) : name > from && name <= limit && (!best || name < best)) best = name;
    }
    if (best) return parseSheetName(`${best}.md`)!.start;
    return direction > 0 && sheet.start < now ? now : null;
  }
  const next = periodOf(sheet.level, sheet.start, direction);
  return next.start > now ? null : next.start;
}

// Every date with a daily sheet, from vault paths.
export function dailySheetDates(paths: Iterable<string>): Set<string> {
  const dates = new Set<string>();
  for (const path of paths) {
    const fileName = path.split("/").pop() ?? path;
    if (parseSheetName(fileName)?.level === "day") dates.add(fileName.slice(0, -3));
  }
  return dates;
}

// Whether `date` falls in today's sheet at `level` (today, this week, this month).
export function isCurrentSheet(sheet: Sheet, today: Date): boolean {
  return inSheet(sheet, midnight(today));
}
