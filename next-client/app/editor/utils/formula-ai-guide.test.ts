import { describe, expect, it } from "vitest";
import { FUNCTIONS } from "./formula-engine";
import { FORMULA_PRESERVATION_RULE, TABLE_FORMULA_GUIDE } from "./formula-ai-guide";

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
