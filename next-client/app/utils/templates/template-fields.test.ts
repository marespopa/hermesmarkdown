import { describe, expect, it } from "vitest";
import { fieldLabel, matchFieldOptions, templateFieldOptions } from "./template-fields";
import { TEMPLATE_TOKENS } from "./template-tokens";

const NOW = new Date(2026, 9, 5, 14, 30);

describe("fieldLabel", () => {
  it("names tokens and questions in plain words", () => {
    expect(fieldLabel("date")).toBe("Today's date");
    expect(fieldLabel(" cursor ")).toBe("Start typing here");
    expect(fieldLabel("prompt: Owner ")).toBe("Ask: Owner");
  });

  it("names blanks, date math and formats", () => {
    expect(fieldLabel("task_1")).toBe("Fill in: Task 1");
    expect(fieldLabel("date+1d")).toBe("Tomorrow's date");
    expect(fieldLabel("date-2w")).toBe("Date −2 weeks");
    expect(fieldLabel("date:dddd")).toBe("Today's date (dddd)");
    expect(fieldLabel("selection")).toBe("Selected text");
    expect(fieldLabel("date-1w:GGGG-[W]ww")).toBe("Date −1 week (GGGG-[W]ww)");
  });

  it("still names legacy tokens in existing templates", () => {
    expect(fieldLabel("weekSheet")).toBe("This week's name");
    expect(fieldLabel("weekday")).toBe("Day name");
  });

  it("names tokens typed in any case", () => {
    expect(fieldLabel("Year")).toBe("Year");
    expect(fieldLabel("MonthName")).toBe("Month name");
  });

  it("returns null for non-fields and empty questions", () => {
    expect(fieldLabel("two words")).toBeNull();
    expect(fieldLabel("weekday+1d")).toBeNull();
    expect(fieldLabel("prompt: ")).toBeNull();
  });
});

describe("templateFieldOptions", () => {
  it("offers a new question, a blank, every built-in token, then date presets", () => {
    const options = templateFieldOptions("", NOW);
    expect(options[0]).toMatchObject({ label: "Ask a question…", ask: "question" });
    expect(options[1]).toMatchObject({ label: "Blank to fill in…", ask: "blank" });
    expect(options.slice(2, 2 + TEMPLATE_TOKENS.length).map((o) => o.token)).toEqual([...TEMPLATE_TOKENS]);
    expect(options.slice(2 + TEMPLATE_TOKENS.length).map((o) => [o.insert, o.detail])).toEqual([
      ["{{date+1d}}", "2026-10-06"],
      ["{{date-1d}}", "2026-10-04"],
      ["{{date:dddd, D MMMM YYYY}}", "Monday, 5 October 2026"],
      ["{{date:GGGG-[W]ww}}", "2026-W41"],
    ]);
  });

  it("puts the doc's questions first, once each", () => {
    const options = templateFieldOptions("{{prompt:Owner}} {{prompt:Team}} {{prompt:Owner}}", NOW);
    expect(options.slice(0, 2).map((o) => o.insert)).toEqual(["{{prompt:Owner}}", "{{prompt:Team}}"]);
    expect(options[0].label).toBe("Ask: Owner");
  });

  it("shows today's value for date fields and the description otherwise", () => {
    const options = templateFieldOptions("", NOW);
    expect(options.find((o) => o.token === "date")?.detail).toBe("2026-10-05");
    expect(options.find((o) => o.token === "time")?.detail).toBe("14:30");
    expect(options.find((o) => o.token === "title")?.detail).toBe("the new file's title");
  });

  it("offers year, month, day, weekday and the other date parts with today's value", () => {
    const options = templateFieldOptions("", NOW);
    const detail = (token: string) => options.find((o) => o.token === token)?.detail;
    expect(detail("year")).toBe("2026");
    expect(detail("month")).toBe("10");
    expect(detail("day")).toBe("05");
    expect(detail("weekday")).toBe("Monday");
    expect(detail("monthName")).toBe("October");
    expect(detail("quarter")).toBe("Q4");
  });

  it("doesn't offer the old sheet names", () => {
    const tokens = templateFieldOptions("", NOW).map((o) => o.token);
    for (const legacy of ["weekSheet", "monthSheet", "quarterSheet", "yearSheet"]) {
      expect(tokens).not.toContain(legacy);
    }
  });
});

describe("matchFieldOptions", () => {
  const options = templateFieldOptions("", NOW);
  const tokens = (query: string) => matchFieldOptions(options, query).map((o) => o.token);

  it("matches a token-name prefix", () => {
    expect(tokens("da")).toContain("date");
    expect(tokens("ti")).toEqual(["time", "title", "slug"]);
  });

  it("matches in any case", () => {
    expect(tokens("Ye")).toContain("year");
  });

  it("matches a word of the plain name", () => {
    expect(tokens("today")).toEqual(["date"]);
    expect(tokens("typing")).toEqual(["cursor"]);
    expect(tokens("ask")).toEqual(["prompt:"]);
    expect(tokens("selected")).toEqual(["selection"]);
  });

  it("returns everything for an empty query", () => {
    expect(matchFieldOptions(options, "")).toHaveLength(options.length);
  });
});
