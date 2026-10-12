// @vitest-environment node
import { describe, expect, it } from "vitest";
import { datesInPeriod, isoWeekOf, monthPeriod, parsePeriodName, periodOf, quarterPeriod, weekPeriod, yearPeriod } from "./period";

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
  it("runs Monday to Sunday with the Thursday as anchor", () => {
    const week = weekPeriod(day(2026, 10, 9));
    expect(week.name).toBe("2026-W41");
    expect(ymd(week.start)).toEqual([2026, 10, 5]);
    expect(ymd(week.end)).toEqual([2026, 10, 11]);
    expect(ymd(week.anchor)).toEqual([2026, 10, 8]);
    expect(week.kind).toBe("week");
    expect(week.noun).toBe("week");
    expect(week.heading).toContain("Week 41");
  });

  it("gives last week on a Monday as the Monday to Sunday that just ended", () => {
    const week = weekPeriod(day(2026, 10, 12), -1);
    expect(week.name).toBe("2026-W41");
    expect(ymd(week.start)).toEqual([2026, 10, 5]);
    expect(ymd(week.end)).toEqual([2026, 10, 11]);
  });

  it("names a week across the new year by its Thursday's year", () => {
    const week = weekPeriod(day(2027, 1, 2));
    expect(week.name).toBe("2026-W53");
    expect(ymd(week.start)).toEqual([2026, 12, 28]);
    expect(ymd(week.end)).toEqual([2027, 1, 3]);
    expect(week.heading).toContain("2026");
    expect(week.heading).toContain("2027");
  });

  it("shows both months in the heading of a week across a month", () => {
    const week = weekPeriod(day(2026, 10, 1));
    expect(week.name).toBe("2026-W40");
    expect(week.heading).toContain("Week 40");
    expect(week.heading).toContain(day(2026, 9, 28).toLocaleDateString(undefined, { month: "short" }));
    expect(week.heading).toContain(day(2026, 10, 4).toLocaleDateString(undefined, { month: "short" }));
    expect(week.heading).toContain("2026");
  });

  it("has seven dates across a DST change", () => {
    expect(datesInPeriod(weekPeriod(day(2026, 3, 29)))).toEqual([
      "2026-03-23", "2026-03-24", "2026-03-25", "2026-03-26", "2026-03-27", "2026-03-28", "2026-03-29",
    ]);
    expect(datesInPeriod(weekPeriod(day(2026, 11, 1)))).toHaveLength(7);
  });
});

describe("monthPeriod", () => {
  it("covers the calendar month with the 1st as anchor", () => {
    const month = monthPeriod(day(2026, 10, 9));
    expect(month.name).toBe("2026-10");
    expect(ymd(month.start)).toEqual([2026, 10, 1]);
    expect(ymd(month.end)).toEqual([2026, 10, 31]);
    expect(ymd(month.anchor)).toEqual([2026, 10, 1]);
    expect(month.heading).toContain("2026");
    expect(datesInPeriod(month)).toHaveLength(31);
  });

  it("gives December of the previous year as last month in January", () => {
    const month = monthPeriod(day(2027, 1, 1), -1);
    expect(month.name).toBe("2026-12");
    expect(ymd(month.end)).toEqual([2026, 12, 31]);
  });
});

describe("parsePeriodName", () => {
  it("reads weekly and monthly sheet names", () => {
    expect(parsePeriodName("2026-W41.md")?.name).toBe("2026-W41");
    expect(ymd(parsePeriodName("2026-W41.md")!.start)).toEqual([2026, 10, 5]);
    expect(parsePeriodName("2026-W53.md")?.name).toBe("2026-W53");
    expect(parsePeriodName("2027-W01.md")?.name).toBe("2027-W01");
    expect(parsePeriodName("2026-10.md")).toMatchObject({ kind: "month", name: "2026-10" });
  });

  it("rejects week and month numbers out of range, and other notes", () => {
    for (const name of ["2026-W00.md", "2026-W54.md", "2027-W53.md", "2026-13.md", "2026-00.md", "notes.md", "2026-10-09.md", "2026-W41"]) {
      expect(parsePeriodName(name)).toBeNull();
    }
  });
});

describe("quarterPeriod / yearPeriod", () => {
  it("builds calendar quarters, moved by offset across years", () => {
    const q4 = quarterPeriod(day(2026, 11, 15));
    expect(q4.name).toBe("2026-Q4");
    expect(ymd(q4.start)).toEqual([2026, 10, 1]);
    expect(ymd(q4.end)).toEqual([2026, 12, 31]);
    expect(q4.heading).toMatch(/^Q4 2026 · /);
    expect(quarterPeriod(day(2026, 2, 1), -1).name).toBe("2025-Q4");
    expect(quarterPeriod(day(2026, 12, 31), 1).name).toBe("2027-Q1");
  });

  it("builds years named YYYY-year", () => {
    const year = yearPeriod(day(2026, 10, 11));
    expect(year.name).toBe("2026-year");
    expect(year.heading).toBe("2026");
    expect(ymd(year.end)).toEqual([2026, 12, 31]);
    expect(yearPeriod(day(2026, 1, 1), -1).name).toBe("2025-year");
    expect(datesInPeriod(yearPeriod(day(2024, 6, 1)))).toHaveLength(366);
  });

  it("parses quarter and year names, and leaves a bare year alone", () => {
    expect(parsePeriodName("2026-Q3.md")?.name).toBe("2026-Q3");
    expect(parsePeriodName("2026-year.md")?.kind).toBe("year");
    expect(parsePeriodName("2026-Q5.md")).toBeNull();
    expect(parsePeriodName("2026.md")).toBeNull();
  });

  it("picks a period by kind", () => {
    expect(periodOf("quarter", day(2026, 4, 2)).name).toBe("2026-Q2");
  });
});
