// Calendar periods behind the `{{weekSheet}}`, `{{monthSheet}}`,
// `{{quarterSheet}}` and `{{yearSheet}}` template tokens: ISO weeks (Monday
// to Sunday, named by the ISO week-year: `2026-W53`), calendar months
// (`2026-10`), calendar quarters (`2026-Q4`) and years (`2026-year`; a bare
// `2026` is too likely to be an ordinary note's name).
// All arithmetic is on local dates (`new Date(y, m, d)`), never UTC, so DST
// changes and time zones never shift a day.

export type PeriodKind = "week" | "month" | "quarter" | "year";

export interface Period {
  kind: PeriodKind;
  name: string; // "2026-W41" | "2026-10" | "2026-Q4" | "2026-year"
  start: Date; // local midnight, first day
  end: Date; // local midnight, last day (inclusive)
}

const pad = (value: number) => String(value).padStart(2, "0");
// Monday = 0 … Sunday = 6.
const isoWeekday = (date: Date) => (date.getDay() + 6) % 7;
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

// The ISO week of a date: its year is the year of the week's Thursday.
export function isoWeekOf(date: Date): { year: number; week: number } {
  const thursday = addDays(date, 3 - isoWeekday(date));
  const year = thursday.getFullYear();
  const dayOfYear = Math.round((thursday.getTime() - new Date(year, 0, 1).getTime()) / 86_400_000);
  return { year, week: Math.floor(dayOfYear / 7) + 1 };
}

// The ISO week holding `date`, moved by `offset` weeks (-1 = last week).
export function weekPeriod(date: Date, offset = 0): Period {
  const start = addDays(date, offset * 7 - isoWeekday(date));
  const { year, week } = isoWeekOf(addDays(start, 3));
  return { kind: "week", name: `${year}-W${pad(week)}`, start, end: addDays(start, 6) };
}

// The calendar month holding `date`, moved by `offset` months (-1 = last month).
export function monthPeriod(date: Date, offset = 0): Period {
  const start = new Date(date.getFullYear(), date.getMonth() + offset, 1);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  return { kind: "month", name: `${start.getFullYear()}-${pad(start.getMonth() + 1)}`, start, end };
}

// The calendar quarter holding `date` (Q1 = January to March), moved by `offset` quarters.
export function quarterPeriod(date: Date, offset = 0): Period {
  const start = new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3 + offset * 3, 1);
  const end = new Date(start.getFullYear(), start.getMonth() + 3, 0);
  return { kind: "quarter", name: `${start.getFullYear()}-Q${start.getMonth() / 3 + 1}`, start, end };
}

// The calendar year holding `date`, moved by `offset` years.
export function yearPeriod(date: Date, offset = 0): Period {
  const year = date.getFullYear() + offset;
  return { kind: "year", name: `${year}-year`, start: new Date(year, 0, 1), end: new Date(year, 11, 31) };
}

// The period of `kind` holding `date`, moved by `offset` periods.
export function periodOf(kind: PeriodKind, date: Date, offset = 0): Period {
  if (kind === "week") return weekPeriod(date, offset);
  if (kind === "month") return monthPeriod(date, offset);
  if (kind === "quarter") return quarterPeriod(date, offset);
  return yearPeriod(date, offset);
}
