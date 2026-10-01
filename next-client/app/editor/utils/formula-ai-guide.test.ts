import { describe, expect, it } from "vitest";
import { FUNCTIONS } from "./formula-engine";
import { FORMULA_PRESERVATION_RULE, NOTE_CALC_EXAMPLE, NOTE_CALC_GUIDE, TABLE_FORMULA_GUIDE } from "./formula-ai-guide";
import { type LineCalc, scanLine } from "./note-calc-scan";

// Labels the real scanner shows for these lines, in order.
function scanLabels(lines: string[]): (string | null)[] {
  let prev: LineCalc | null = null;
  return lines.map((line, i) => {
    prev = scanLine(line, i + 1, prev);
    return prev.label;
  });
}

describe("AI formula guide", () => {
  it("advertises exactly the functions the engine implements", () => {
    for (const name of Object.keys(FUNCTIONS)) {
      expect(TABLE_FORMULA_GUIDE).toContain(name);
    }
    expect(TABLE_FORMULA_GUIDE).not.toMatch(/=AVG\(/);
  });

  it("only uses reference syntax the engine accepts in its examples", () => {
    // `A:A` isn't supported; whole columns are written =SUM(B).
    expect(FORMULA_PRESERVATION_RULE + TABLE_FORMULA_GUIDE).not.toMatch(/\b[A-Z]:[A-Z]\b/);
  });
});

describe("AI note calculator guide", () => {
  it("shows the example with the results the scanner actually produces", () => {
    expect(scanLabels(NOTE_CALC_EXAMPLE.lines)).toEqual(NOTE_CALC_EXAMPLE.results);
    for (const line of NOTE_CALC_EXAMPLE.lines) expect(NOTE_CALC_GUIDE).toContain(line);
  });

  it("documents syntax the scanner accepts", () => {
    expect(scanLabels(["120 * 12"])).toEqual(["= 1440"]);
    expect(scanLabels(["450 + 15%"])).toEqual(["= 517.5"]);
    expect(scanLabels(["15% of 200"])).toEqual(["= 30"]);
    // A computed assignment shows its own result; a bare literal doesn't.
    expect(scanLabels(["rent = 1200", "rent = rent + 100", "rent * 2"])).toEqual([null, "= 1300", "= 2600"]);
    expect(scanLabels(["monthly rent = 1,200", "- monthly rent * 12"])).toEqual([null, "= 14400"]);
    expect(scanLabels(["rent ron = 1200", "rent ron * 2"])).toEqual([null, "= 2400"]);
  });

  it("warns against the forms that break the calculator", () => {
    // A result typed after the expression, or a unit inside it, gets no label.
    expect(scanLabels(["rent = 1200", "utilities = 180", "rent + utilities = 1380"])[2]).toBeNull();
    expect(scanLabels(["rent = 1200 RON", "rent * 2"])[1]).toBeNull();
    expect(NOTE_CALC_GUIDE).toContain("NEVER write the result yourself");
    expect(FORMULA_PRESERVATION_RULE).toContain("inline calculator");
  });
});
