import { describe, expect, it } from "vitest";
import { decorateNoteCalcLabel, normalizeMathExpression } from "./note-calc-normalize";

const expr = (raw: string, known: string[] = []) =>
  normalizeMathExpression(raw, (name) => known.includes(name))?.expr ?? null;

describe("normalizeMathExpression", () => {
  it("rewrites operator words between operands", () => {
    expect(expr("3 times 4")).toBe("3 * 4");
    expect(expr("10 multiplied by 2")).toBe("10 * 2");
    expect(expr("10 divided by 2")).toBe("10 / 2");
    expect(expr("10 over 4")).toBe("10 / 4");
    expect(expr("10 split by 5")).toBe("10 / 5");
    expect(expr("3 plus 4")).toBe("3 + 4");
    expect(expr("3 added to 4")).toBe("3 + 4");
    expect(expr("3 and 4")).toBe("3 + 4");
    expect(expr("9 minus 4")).toBe("9 - 4");
    expect(expr("9 less 4")).toBe("9 - 4");
    expect(expr("minus 5 plus 3")).toBe("- 5 + 3");
  });

  it("tolerates common typos", () => {
    expect(expr("10 multipled by 3")).toBe("10 * 3");
    expect(expr("10 multiplited by 3")).toBe("10 * 3");
    expect(expr("10 devided by 4")).toBe("10 / 4");
    expect(expr("20 precent of 150")).toBe("20 % of 150");
  });

  it("handles percent words, powers, roots and scale suffixes", () => {
    expect(expr("20 percent of 150")).toBe("20 % of 150");
    expect(expr("9 squared")).toBe("9 ^ 2");
    expect(expr("2 cubed")).toBe("2 ^ 3");
    expect(expr("square root of 16")).toBe("sqrt ( 16 )");
    expect(expr("sqrt of 5k")).toBe("sqrt ( ( 5 * 1000 ) )");
    expect(expr("2.5m")).toBe("( 2.5 * 1000000 )");
    expect(expr("1b")).toBe("( 1 * 1000000000 )");
    expect(expr("3 million")).toBe("( 3 * 1000000 )");
  });

  it("only reads `x` as times between numbers, never in hex or words", () => {
    expect(expr("5 x 4")).toBe("5 * 4");
    expect(expr("5x4")).toBe("5 * 4");
    expect(expr("0x1f + 1")).toBeNull();
    expect(expr("box 4")).toBe("4");
  });

  it("fails on an operator word without an operand on each side", () => {
    expect(expr("and 5")).toBeNull();
    expect(expr("5 and")).toBeNull();
    expect(expr("5 times")).toBeNull();
  });

  it("drops filler words and unit nouns, and stops at the first prose word from the right", () => {
    expect(expr("3 nodes multiplied by 45 plus 19% VAT")).toBe("3 * 45 + 19 %");
    expect(expr("Total server cost: 3 nodes times 45")).toBe("3 * 45");
    expect(expr("I have 3 cats and 2 dogs")).toBe("3 + 2");
    expect(expr("roughly 40 each")).toBe("40");
    expect(expr("hello world")).toBeNull();
  });

  it("keeps variables in scope, including multi-word names and operator-like names", () => {
    expect(expr("monthly rent plus 300", ["monthly rent"])).toBe("monthly rent + 300");
    expect(expr("x times 2", ["x"])).toBe("x * 2");
    expect(expr("tax times 2", ["tax"])).toBe("tax * 2");
  });

  it("takes out a currency or unit and remembers it", () => {
    expect(normalizeMathExpression("$40 times 3")).toEqual({ expr: "40 * 3", unit: "$" });
    expect(normalizeMathExpression("3 times 45 RON")).toEqual({ expr: "3 * 45", unit: "RON" });
    expect(normalizeMathExpression("5 lei minus 2 lei")).toEqual({ expr: "5 - 2", unit: "lei" });
  });

  it("turns a percentage share into a percent result", () => {
    expect(normalizeMathExpression("25 is what % of 200")).toEqual({ expr: "(25) / (200) * 100", isPercentResult: true });
    expect(normalizeMathExpression("Share: 25 as a percent of 200")?.expr).toBe("(25) / (200) * 100");
  });
});

describe("decorateNoteCalcLabel", () => {
  it("puts symbols in front, codes after and adds % for shares", () => {
    expect(decorateNoteCalcLabel("120", { expr: "", unit: "$" })).toBe("$120");
    expect(decorateNoteCalcLabel("-10", { expr: "", unit: "$" })).toBe("-$10");
    expect(decorateNoteCalcLabel("160.65", { expr: "", unit: "RON" })).toBe("160.65 RON");
    expect(decorateNoteCalcLabel("12.5", { expr: "", isPercentResult: true })).toBe("12.5%");
  });
});
