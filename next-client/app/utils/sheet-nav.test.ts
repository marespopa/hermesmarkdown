import { describe, expect, it } from "vitest";
import { dailySheetDates, isCurrentSheet, levelTarget, parseSheetName, sheetLabel, stepTarget, type Sheet } from "./sheet-nav";
import { todayNoteName } from "./today-note";

// Saturday, October 11, 2026 (ISO week 41: Oct 5 – 11).
const TODAY = new Date(2026, 9, 11, 15, 30);
const sheet = (name: string) => parseSheetName(name)!;
const day = (date: Date | null) => (date ? todayNoteName(date) : null);
const DATES = new Set(["2026-09-30", "2026-10-02", "2026-10-06", "2026-10-08"]);

describe("parseSheetName", () => {
  it("recognizes daily, weekly and monthly sheets", () => {
    expect(sheet("2026-10-11.md").level).toBe("day");
    expect(sheet("2026-W41.md").level).toBe("week");
    expect(sheet("2026-10.md").level).toBe("month");
  });

  it("rejects other notes and impossible dates", () => {
    expect(parseSheetName("Release plan.md")).toBeNull();
    expect(parseSheetName("2026-02-31.md")).toBeNull();
    expect(parseSheetName("2026-W60.md")).toBeNull();
    expect(parseSheetName("2026-10-11.txt")).toBeNull();
  });
});

describe("sheetLabel", () => {
  it("keeps labels short", () => {
    expect(sheetLabel(sheet("2026-10-11.md"))).toContain("11");
    expect(sheetLabel(sheet("2026-W41.md"))).toMatch(/^Week 41 · /);
    expect(sheetLabel(sheet("2026-W41.md"))).not.toContain("2026");
    expect(sheetLabel(sheet("2026-10.md"))).toContain("2026");
  });
});

describe("levelTarget", () => {
  it("goes up from a day to the week and month holding it", () => {
    const from = sheet("2026-10-06.md");
    expect(day(levelTarget(from, "week", TODAY, DATES))).toBe("2026-10-06");
    expect(day(levelTarget(from, "month", TODAY, DATES))).toBe("2026-10-06");
  });

  it("goes from a week to the month of its Thursday", () => {
    // Week 40 runs Sep 28 – Oct 4; its Thursday is Oct 1.
    expect(day(levelTarget(sheet("2026-W40.md"), "month", TODAY, DATES))).toBe("2026-10-01");
  });

  it("goes down to today inside the current week or month", () => {
    expect(day(levelTarget(sheet("2026-W41.md"), "day", TODAY, DATES))).toBe("2026-10-11");
    expect(day(levelTarget(sheet("2026-10.md"), "week", TODAY, DATES))).toBe("2026-10-11");
  });

  it("goes down to the latest day with a sheet in a past week", () => {
    expect(day(levelTarget(sheet("2026-W40.md"), "day", TODAY, DATES))).toBe("2026-10-02");
  });

  it("has no day for a past week without daily sheets", () => {
    expect(levelTarget(sheet("2026-W38.md"), "day", TODAY, DATES)).toBeNull();
  });

  it("goes from a past month to its last week", () => {
    // September's last week is week 39 (Thursday Sep 24); week 40's Thursday, Oct 1, is October's.
    const target = levelTarget(sheet("2026-09.md"), "week", TODAY, DATES);
    expect(day(target)).toBe("2026-09-24");
  });
});

describe("stepTarget", () => {
  it("moves days to the nearest day with a sheet", () => {
    const from = sheet("2026-10-06.md");
    expect(day(stepTarget(from, -1, TODAY, DATES))).toBe("2026-10-02");
    expect(day(stepTarget(from, 1, TODAY, DATES))).toBe("2026-10-08");
  });

  it("moves forward from the latest sheet to today", () => {
    expect(day(stepTarget(sheet("2026-10-08.md"), 1, TODAY, DATES))).toBe("2026-10-11");
  });

  it("stops at today and at the first sheet", () => {
    expect(stepTarget(sheet("2026-10-11.md"), 1, TODAY, DATES)).toBeNull();
    expect(stepTarget(sheet("2026-09-30.md"), -1, TODAY, DATES)).toBeNull();
  });

  it("moves weeks and months by one, never into the future", () => {
    expect(day(stepTarget(sheet("2026-W41.md"), -1, TODAY, DATES))).toBe("2026-09-28");
    expect(stepTarget(sheet("2026-W41.md"), 1, TODAY, DATES)).toBeNull();
    expect(day(stepTarget(sheet("2026-09.md"), 1, TODAY, DATES))).toBe("2026-10-01");
    expect(stepTarget(sheet("2026-10.md"), 1, TODAY, DATES)).toBeNull();
  });
});

describe("dailySheetDates", () => {
  it("collects only daily sheet names", () => {
    const dates = dailySheetDates(["journal/2026/2026-10-06.md", "journal/2026/2026-W41.md", "Release plan.md"]);
    expect([...dates]).toEqual(["2026-10-06"]);
  });
});

describe("isCurrentSheet", () => {
  it("is true for today, this week and this month", () => {
    const current: Sheet[] = [sheet("2026-10-11.md"), sheet("2026-W41.md"), sheet("2026-10.md")];
    expect(current.every((s) => isCurrentSheet(s, TODAY))).toBe(true);
    expect(isCurrentSheet(sheet("2026-W40.md"), TODAY)).toBe(false);
  });
});
