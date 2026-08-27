import { describe, expect, it } from "vitest";
import { findDateAtPos } from "./date-detection";

describe("findDateAtPos", () => {
  it.each([
    ["2026-08-27", "iso", 2026, 8, 27],
    ["08/27/2026", "slashed", 2026, 8, 27],
    ["27.08.2026", "dotted", 2026, 8, 27],
    ["[[2026-08-27]]", "wiki", 2026, 8, 27],
    ["@due(2026-08-27)", "iso", 2026, 8, 27],
  ] as const)("detects %s as %s", (value, format, year, month, day) => {
    const text = `Task ${value}`;
    const match = findDateAtPos(text, text.indexOf(value) + 2);

    expect(match).not.toBeNull();
    expect(match).toMatchObject({ format, rawString: value, start: 5, end: 5 + value.length });
    if (format === "iso" || format === "wiki") {
      expect(match?.date.toISOString().slice(0, 10)).toBe(
        `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      );
    } else {
      expect([match?.date.getFullYear(), match?.date.getMonth() + 1, match?.date.getDate()]).toEqual([
        year,
        month,
        day,
      ]);
    }
  });

  it("returns null when the cursor is outside a date or no date exists", () => {
    const text = "Task due 2026-08-27";

    expect(findDateAtPos(text, 0)).toBeNull();
    expect(findDateAtPos("No date here", 5)).toBeNull();
  });

  it("uses absolute offsets when the date is near the end of a long document", () => {
    const prefix = "x".repeat(100);
    const text = `${prefix} 2026-08-27`;
    const start = prefix.length + 1;
    const match = findDateAtPos(text, start + 5);

    expect(match?.start).toBe(start);
    expect(match?.end).toBe(start + 10);
  });
});