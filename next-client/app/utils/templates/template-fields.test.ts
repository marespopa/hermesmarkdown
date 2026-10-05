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
  });

  it("returns null for non-fields and empty questions", () => {
    expect(fieldLabel("two words")).toBeNull();
    expect(fieldLabel("weekday+1d")).toBeNull();
    expect(fieldLabel("prompt: ")).toBeNull();
  });
});

describe("templateFieldOptions", () => {
  it("offers a new question, a blank, every built-in token, then tomorrow", () => {
    const options = templateFieldOptions("", NOW);
    expect(options[0]).toMatchObject({ label: "Ask a question…", ask: "question" });
    expect(options[1]).toMatchObject({ label: "Blank to fill in…", ask: "blank" });
    expect(options.slice(2, -1).map((o) => o.token)).toEqual([...TEMPLATE_TOKENS]);
    expect(options.at(-1)).toMatchObject({ insert: "{{date+1d}}", detail: "2026-10-06" });
  });

  it("puts the doc's questions first, once each", () => {
    const options = templateFieldOptions("{{prompt:Owner}} {{prompt:Team}} {{prompt:Owner}}", NOW);
    expect(options.slice(0, 2).map((o) => o.insert)).toEqual(["{{prompt:Owner}}", "{{prompt:Team}}"]);
    expect(options[0].label).toBe("Ask: Owner");
  });

  it("shows today's value for date fields and the description otherwise", () => {
    const options = templateFieldOptions("", NOW);
    expect(options.find((o) => o.token === "date")?.detail).toBe("2026-10-05");
    expect(options.find((o) => o.token === "weekday")?.detail).toBe("Monday");
    expect(options.find((o) => o.token === "title")?.detail).toBe("the new note's title");
  });
});

describe("matchFieldOptions", () => {
  const options = templateFieldOptions("", NOW);
  const tokens = (query: string) => matchFieldOptions(options, query).map((o) => o.token);

  it("matches a token-name prefix", () => {
    expect(tokens("da")).toContain("date");
    expect(tokens("da")).toContain("day");
  });

  it("matches a word of the plain name", () => {
    expect(tokens("today")).toEqual(["date"]);
    expect(tokens("typing")).toEqual(["cursor"]);
    expect(tokens("ask")).toEqual(["prompt:"]);
  });

  it("returns everything for an empty query", () => {
    expect(matchFieldOptions(options, "")).toHaveLength(options.length);
  });
});
