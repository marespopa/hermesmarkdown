// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isoWeekOf, monthPeriod, periodOf, quarterPeriod, weekPeriod, yearPeriod } from "./period";

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const ymd = (date: Date) => [date.getFullYear(), date.getMonth() + 1, date.getDate()];

describe("isoWeekOf", () => {
  it("numbers weeks by the ISO week-year", () => {
    expect(isoWeekOf(day(2026, 10, 9))).toEqual({ year: 2026, week: 41 });
    expect(isoWeekOf(day(2026, 12, 31))).toEqual({ year: 2026, week: 53 });
    expect(isoWeekOf(day(2027, 1, 3))).toEqual({ year: 2026, week: 53 });
    expect(isoWeekOf(day(2027, 1, 4))).toEqual({ year: 2027, week: 1 });
  });
});

describe("weekPeriod", () => {
  it("runs Monday to Sunday", () => {
    const week = weekPeriod(day(2026, 10, 9));
    expect(week).toMatchObject({ kind: "week", name: "2026-W41" });
    expect(ymd(week.start)).toEqual([2026, 10, 5]);
    expect(ymd(week.end)).toEqual([2026, 10, 11]);
  });

  it("gives last week on a Monday as the Monday to Sunday that just ended", () => {
    const week = weekPeriod(day(2026, 10, 12), -1);
    expect(week.name).toBe("2026-W41");
    expect(ymd(week.start)).toEqual([2026, 10, 5]);
  });

  it("names a week across the new year by its Thursday's year", () => {
    const week = weekPeriod(day(2027, 1, 2));
    expect(week.name).toBe("2026-W53");
    expect(ymd(week.start)).toEqual([2026, 12, 28]);
    expect(ymd(week.end)).toEqual([2027, 1, 3]);
  });

  it("keeps whole days across a DST change", () => {
    const week = weekPeriod(day(2026, 3, 29));
    expect(ymd(week.start)).toEqual([2026, 3, 23]);
    expect(ymd(week.end)).toEqual([2026, 3, 29]);
  });
});

describe("monthPeriod", () => {
  it("covers the calendar month", () => {
    const month = monthPeriod(day(2026, 10, 9));
    expect(month.name).toBe("2026-10");
    expect(ymd(month.start)).toEqual([2026, 10, 1]);
    expect(ymd(month.end)).toEqual([2026, 10, 31]);
  });

  it("gives December of the previous year as last month in January", () => {
    const month = monthPeriod(day(2027, 1, 1), -1);
    expect(month.name).toBe("2026-12");
    expect(ymd(month.end)).toEqual([2026, 12, 31]);
  });
});

describe("quarterPeriod / yearPeriod", () => {
  it("builds calendar quarters, moved by offset across years", () => {
    const q4 = quarterPeriod(day(2026, 11, 15));
    expect(q4.name).toBe("2026-Q4");
    expect(ymd(q4.start)).toEqual([2026, 10, 1]);
    expect(ymd(q4.end)).toEqual([2026, 12, 31]);
    expect(quarterPeriod(day(2026, 2, 1), -1).name).toBe("2025-Q4");
    expect(quarterPeriod(day(2026, 12, 31), 1).name).toBe("2027-Q1");
  });

  it("builds years named YYYY-year", () => {
    const year = yearPeriod(day(2026, 10, 11));
    expect(year.name).toBe("2026-year");
    expect(ymd(year.end)).toEqual([2026, 12, 31]);
    expect(yearPeriod(day(2026, 1, 1), -1).name).toBe("2025-year");
  });

  it("picks a period by kind", () => {
    expect(periodOf("quarter", day(2026, 4, 2)).name).toBe("2026-Q2");
  });
});
