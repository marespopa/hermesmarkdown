// Periods for rollup sheets: ISO weeks (Monday to Sunday, named by the ISO
// week-year: `2026-W53`), calendar months (`2026-10`), calendar quarters
// (`2026-Q4`) and years (`2026-year`; a bare `2026` is too likely to be an
// ordinary note's name).
// All arithmetic is on local dates (`new Date(y, m, d)`), never UTC, so DST
// changes and time zones never shift a day.

import { todayNoteName } from "../today-note";

export type RollupKind = "week" | "month" | "quarter" | "year";

export interface RollupPeriod {
  kind: RollupKind;
  name: string; // "2026-W41" | "2026-10" | "2026-Q4" | "2026-year"
  start: Date; // local midnight, first day
  end: Date; // local midnight, last day (inclusive)
  anchor: Date; // Thursday (week) / first day (month, quarter, year), for the Daily Sheets folder pattern
  heading: string; // "Week 41 · Oct 5 – 11, 2026" | "October 2026" | "Q4 2026 · October – December" | "2026"
  noun: RollupKind;
}

const pad = (value: number) => String(value).padStart(2, "0");
// Monday = 0 … Sunday = 6.
const isoWeekday = (date: Date) => (date.getDay() + 6) % 7;
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const fmt = (date: Date, options: Intl.DateTimeFormatOptions) => date.toLocaleDateString(undefined, options);

// The ISO week of a date: its year is the year of the week's Thursday.
export function isoWeekOf(date: Date): { year: number; week: number } {
  const thursday = addDays(date, 3 - isoWeekday(date));
  const year = thursday.getFullYear();
  const dayOfYear = Math.round((thursday.getTime() - new Date(year, 0, 1).getTime()) / 86_400_000);
  return { year, week: Math.floor(dayOfYear / 7) + 1 };
}

// 52 or 53: Dec 28 is always in the year's last ISO week.
function weeksInYear(year: number): number {
  return isoWeekOf(new Date(year, 11, 28)).week;
}

// "Oct 5 – 11, 2026", "Sep 28 – Oct 4, 2026", "Dec 28, 2026 – Jan 3, 2027".
function weekRange(start: Date, end: Date): string {
  if (start.getFullYear() !== end.getFullYear()) {
    const full: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
    return `${fmt(start, full)} – ${fmt(end, full)}`;
  }
  const from = fmt(start, { month: "short", day: "numeric" });
  const to = start.getMonth() === end.getMonth() ? fmt(end, { day: "numeric" }) : fmt(end, { month: "short", day: "numeric" });
  return `${from} – ${to}, ${end.getFullYear()}`;
}

// The ISO week holding `date`, moved by `offset` weeks (-1 = last week).
export function weekPeriod(date: Date, offset = 0): RollupPeriod {
  const start = addDays(date, offset * 7 - isoWeekday(date));
  const end = addDays(start, 6);
  const anchor = addDays(start, 3);
  const { year, week } = isoWeekOf(anchor);
  return {
    kind: "week",
    name: `${year}-W${pad(week)}`,
    start,
    end,
    anchor,
    heading: `Week ${week} · ${weekRange(start, end)}`,
    noun: "week",
  };
}

// The calendar month holding `date`, moved by `offset` months (-1 = last month).
export function monthPeriod(date: Date, offset = 0): RollupPeriod {
  const start = new Date(date.getFullYear(), date.getMonth() + offset, 1);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  return {
    kind: "month",
    name: `${start.getFullYear()}-${pad(start.getMonth() + 1)}`,
    start,
    end,
    anchor: start,
    heading: fmt(start, { month: "long", year: "numeric" }),
    noun: "month",
  };
}

// The calendar quarter holding `date` (Q1 = January to March), moved by `offset` quarters.
export function quarterPeriod(date: Date, offset = 0): RollupPeriod {
  const start = new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3 + offset * 3, 1);
  const end = new Date(start.getFullYear(), start.getMonth() + 3, 0);
  const quarter = start.getMonth() / 3 + 1;
  return {
    kind: "quarter",
    name: `${start.getFullYear()}-Q${quarter}`,
    start,
    end,
    anchor: start,
    heading: `Q${quarter} ${start.getFullYear()} · ${fmt(start, { month: "long" })} – ${fmt(end, { month: "long" })}`,
    noun: "quarter",
  };
}

// The calendar year holding `date`, moved by `offset` years.
export function yearPeriod(date: Date, offset = 0): RollupPeriod {
  const year = date.getFullYear() + offset;
  const start = new Date(year, 0, 1);
  return {
    kind: "year",
    name: `${year}-year`,
    start,
    end: new Date(year, 11, 31),
    anchor: start,
    heading: String(year),
    noun: "year",
  };
}

// The period of `kind` holding `date`, moved by `offset` periods.
export function periodOf(kind: RollupKind, date: Date, offset = 0): RollupPeriod {
  if (kind === "week") return weekPeriod(date, offset);
  if (kind === "month") return monthPeriod(date, offset);
  if (kind === "quarter") return quarterPeriod(date, offset);
  return yearPeriod(date, offset);
}

const REGEX_WEEK_NAME = /^(\d{4})-W(\d{2})\.md$/;
const REGEX_MONTH_NAME = /^(\d{4})-(\d{2})\.md$/;
const REGEX_QUARTER_NAME = /^(\d{4})-Q([1-4])\.md$/;
const REGEX_YEAR_NAME = /^(\d{4})-year\.md$/;

// The period a rollup sheet's file name stands for, or null when it isn't
// one: "2026-W41.md" (W01 to the year's last ISO week), "2026-10.md",
// "2026-Q4.md" or "2026-year.md".
export function parseRollupName(fileName: string): RollupPeriod | null {
  const week = REGEX_WEEK_NAME.exec(fileName);
  if (week) {
    const year = Number(week[1]);
    const number = Number(week[2]);
    if (number < 1 || number > weeksInYear(year)) return null;
    const jan4 = new Date(year, 0, 4);
    return weekPeriod(addDays(jan4, (number - 1) * 7 - isoWeekday(jan4)));
  }
  const month = REGEX_MONTH_NAME.exec(fileName);
  if (month) {
    const number = Number(month[2]);
    if (number < 1 || number > 12) return null;
    return monthPeriod(new Date(Number(month[1]), number - 1, 1));
  }
  const quarter = REGEX_QUARTER_NAME.exec(fileName);
  if (quarter) return quarterPeriod(new Date(Number(quarter[1]), (Number(quarter[2]) - 1) * 3, 1));
  const year = REGEX_YEAR_NAME.exec(fileName);
  if (year) return yearPeriod(new Date(Number(year[1]), 0, 1));
  return null;
}

// Every day of the period as "YYYY-MM-DD", in order.
export function datesInPeriod(period: RollupPeriod): string[] {
  const out: string[] = [];
  for (let day = period.start; day <= period.end; day = addDays(day, 1)) out.push(todayNoteName(day));
  return out;
}

// The ISO weeks whose Thursday falls in the month: each week belongs to
// exactly one month, the same one its sheet's folder is picked by.
export function weeksOwnedByMonth(period: RollupPeriod): RollupPeriod[] {
  const out: RollupPeriod[] = [];
  const first = period.start;
  let thursday = addDays(first, (3 - isoWeekday(first) + 7) % 7);
  while (thursday.getMonth() === first.getMonth() && thursday.getFullYear() === first.getFullYear()) {
    out.push(weekPeriod(thursday));
    thursday = addDays(thursday, 7);
  }
  return out;
}

// The periods one level down whose notes a sheet collects: a month's weeks
// (by Thursday), a quarter's months, a year's quarters. None for a week.
export function childPeriods(period: RollupPeriod): RollupPeriod[] {
  if (period.kind === "month") return weeksOwnedByMonth(period);
  if (period.kind === "quarter") return [0, 1, 2].map((offset) => monthPeriod(period.start, offset));
  if (period.kind === "year") return [0, 1, 2, 3].map((offset) => quarterPeriod(period.start, offset));
  return [];
}
