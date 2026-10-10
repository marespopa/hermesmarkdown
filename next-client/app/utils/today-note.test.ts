// @vitest-environment node
import { describe, expect, it } from "vitest";
import { findTodayNote, resolveTodayFolder, todayNoteName } from "./today-note";

const NOW = new Date(2026, 9, 9, 8, 30); // Fri Oct 9 2026

describe("todayNoteName", () => {
  it("is the local date, zero-padded", () => {
    expect(todayNoteName(NOW)).toBe("2026-10-09");
    expect(todayNoteName(new Date(2026, 0, 2, 23, 59))).toBe("2026-01-02");
  });
});

describe("findTodayNote", () => {
  it("prefers the sheet in the New Notes folder", () => {
    expect(findTodayNote(["journal/2026-10-09.md", "log/2026-10-09.md"], NOW, "log")).toBe("log/2026-10-09.md");
    expect(findTodayNote(["a/2026-10-09.md", "2026-10-09.md"], NOW)).toBe("2026-10-09.md");
  });

  it("falls back to the shallowest sheet elsewhere, then by path", () => {
    expect(findTodayNote(["z/2026-10-09.md", "a/b/2026-10-09.md", "b/2026-10-09.md"], NOW, "log")).toBe("b/2026-10-09.md");
  });

  it("is null without a sheet for today", () => {
    expect(findTodayNote(["2026-10-08.md", "notes/2026-10-09-standup.md"], NOW)).toBeNull();
  });
});

describe("resolveTodayFolder", () => {
  it("fills in the year and month", () => {
    expect(resolveTodayFolder("journal/{{year}}/{{ month }}", NOW)).toBe("journal/2026/10");
    expect(resolveTodayFolder("log", NOW)).toBe("log");
  });
});
