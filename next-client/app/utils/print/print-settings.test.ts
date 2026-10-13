// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DEFAULT_PRINT_SETTINGS, printDate, printSettingsFrom, templateSlots } from "./print-settings";

const values = { title: "Q4 review", date: "2026-10-13" };

describe("printSettingsFrom", () => {
  it("defaults to A4, 18 × 16 mm margins, no header or footer and the comment marker", () => {
    expect(printSettingsFrom("# No frontmatter")).toEqual(DEFAULT_PRINT_SETTINGS);
    expect(DEFAULT_PRINT_SETTINGS.pageBreak).toBe("<!-- pagebreak -->");
  });

  it("reads the pdf_ keys", () => {
    const note = '---\npdf_page_size: letter\npdf_margins: 20 15mm 1in\npdf_header: "{title} | {date}"\npdf_footer: \'{page}\'\npdf_page_break: "\\pagebreak"\n---\n# Body';
    expect(printSettingsFrom(note)).toEqual({
      pageSize: "Letter",
      margins: "20mm 15mm 1in",
      header: "{title} | {date}",
      footer: "{page}",
      pageBreak: "\\pagebreak",
    });
  });

  it("falls back on page size and margins it can't read", () => {
    const note = "---\npdf_page_size: A3\npdf_margins: wide\n---\n";
    expect(printSettingsFrom(note)).toMatchObject({ pageSize: "A4", margins: "18mm 16mm" });
    expect(printSettingsFrom("---\npdf_margins: 1 2 3 4 5\n---\n").margins).toBe("18mm 16mm");
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
