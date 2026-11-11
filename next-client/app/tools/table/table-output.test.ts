import { describe, expect, it } from "vitest";
import { hasFormulas, tableOutput } from "./table-output";

const BUDGET = "| Item | Cost |\n|---|---|\n| Rent | 1000 |\n| Food | 400 |\n| Total | =SUM(B2:B3) |";

describe("tableOutput", () => {
  it("aligns each table's columns", () => {
    expect(tableOutput("| a | long header |\n|---|---|\n| wide cell | x |")).toBe(
      "| a         | long header |\n| :-------- | :---------- |\n| wide cell | x           |",
    );
  });

  it("leaves paragraphs, and blocks that mix text and rows, as they are", () => {
    const text = "Intro line\n| a |\n|---|\n\nPlain paragraph";
    expect(tableOutput(text)).toBe(text);
  });

  it("keeps formulas, or swaps in their results", () => {
    expect(tableOutput(BUDGET, "formulas")).toContain("| Total | =SUM(B2:B3) |");
    expect(tableOutput(BUDGET, "results")).toMatch(/\| Total \| 1,?400(\.00)? +\|/);
    expect(tableOutput(BUDGET, "results")).not.toContain("=SUM");
  });

  it("knows whether a table has formulas", () => {
    expect(hasFormulas(BUDGET)).toBe(true);
    expect(hasFormulas("| a = b |\n|---|")).toBe(false);
  });
});
