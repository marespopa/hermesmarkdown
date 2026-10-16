// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DEFAULT_PRINT_SETTINGS, MARGIN_CSS, normalizePrintSettings, printDate, templateSlots } from "./print-settings";

const values = { title: "Q4 review", date: "2026-10-13" };

describe("normalizePrintSettings", () => {
  it("defaults to A4, normal margins, no header or footer and no rule breaks", () => {
    expect(normalizePrintSettings(undefined)).toEqual(DEFAULT_PRINT_SETTINGS);
    expect(MARGIN_CSS[DEFAULT_PRINT_SETTINGS.margins]).toBe("18mm 16mm");
  });

  it("keeps stored choices it can read", () => {
    const stored = { pageSize: "Letter", margins: "wide", header: "{title} | {date}", footer: "{page}", breakAtRules: true };
    expect(normalizePrintSettings(stored)).toEqual(stored);
  });

  it("falls back on values it can't read", () => {
    expect(normalizePrintSettings({ pageSize: "A3", margins: "1in", header: "  ", footer: 4, breakAtRules: "yes" })).toEqual(DEFAULT_PRINT_SETTINGS);
  });
});

describe("templateSlots", () => {
  it("centres a single part and fills in the title and date", () => {
    expect(templateSlots("{title} – {date}", values)).toEqual({
      left: null,
      center: [{ text: "Q4 review" }, { text: " – " }, { text: "2026-10-13" }],
      right: null,
    });
  });

  it("splits on | into left and right, or left, centre and right", () => {
    expect(templateSlots("{title} | {page} / {pages}", values)).toEqual({
      left: [{ text: "Q4 review" }],
      center: null,
      right: [{ counter: "page" }, { text: " / " }, { counter: "pages" }],
    });
    const three = templateSlots("Draft |  | {page}", values);
    expect(three.left).toEqual([{ text: "Draft" }]);
    expect(three.center).toBeNull();
    expect(three.right).toEqual([{ counter: "page" }]);
  });
});

describe("printDate", () => {
  it("formats the local date as YYYY-MM-DD", () => {
    expect(printDate(new Date(2026, 0, 5, 9))).toBe("2026-01-05");
  });
});
