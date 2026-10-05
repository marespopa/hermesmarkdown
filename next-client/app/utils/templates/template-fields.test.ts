import { describe, expect, it } from "vitest";
import { templateFieldOptions } from "./template-fields";
import { TEMPLATE_TOKENS } from "./template-tokens";

const NOW = new Date(2026, 9, 5, 14, 30);

describe("templateFieldOptions", () => {
  it("lists a new prompt and every built-in token", () => {
    const labels = templateFieldOptions("", NOW).map((o) => o.label);
    expect(labels).toEqual(["prompt:…", ...TEMPLATE_TOKENS]);
  });

  it("puts the doc's prompt labels first, once each", () => {
    const options = templateFieldOptions("{{prompt:Owner}} {{prompt:Team}} {{prompt:Owner}}", NOW);
    expect(options.slice(0, 2).map((o) => o.insert)).toEqual(["{{prompt:Owner}}", "{{prompt:Team}}"]);
  });

  it("shows today's value for date tokens and the description otherwise", () => {
    const options = templateFieldOptions("", NOW);
    expect(options.find((o) => o.label === "date")?.detail).toBe("2026-10-05");
    expect(options.find((o) => o.label === "weekday")?.detail).toBe("Monday");
    expect(options.find((o) => o.label === "title")?.detail).toBe("the new note's title");
    expect(options.find((o) => o.label === "cursor")?.detail).toContain("caret");
  });

  it("leaves the caret inside a new prompt", () => {
    const prompt = templateFieldOptions("", NOW).find((o) => o.label === "prompt:…")!;
    expect(prompt.insert.slice(0, prompt.caret)).toBe("{{prompt:");
  });
});
