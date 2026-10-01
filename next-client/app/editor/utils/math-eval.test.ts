import { describe, expect, it } from "vitest";
import { evaluateMath, evaluateMathExpression, normalizeMathName, type MathEvalOptions } from "./math-eval";

describe("evaluateMath", () => {
  it("evaluates arithmetic expressions with operator precedence", () => {
    expect(evaluateMath("2 + 3 * 4")).toBe(14);
    expect(evaluateMath("(2 + 3) * 4")).toBe(20);
  });

  it("supports unary minus and nested parentheses", () => {
    expect(evaluateMath("-3 + 5")).toBe(2);
    expect(evaluateMath("2 * (-(3 + 4))")).toBe(-14);
  });

  it("rejects unsupported tokens instead of evaluating them", () => {
    expect(evaluateMath("1;window.alert(1)")).toBeNull();
    expect(evaluateMath("1 + foo")).toBeNull();
  });

  it("keeps percent, names, thousands separators and tab gaps disabled without options", () => {
    expect(evaluateMath("10%")).toBeNull();
    expect(evaluateMath("1 + foo")).toBeNull();
    expect(evaluateMath("1,200 + 1")).toBeNull();
    expect(evaluateMath("1 +\t2")).toBeNull();
  });

  it("fails on division by zero", () => {
    expect(evaluateMath("1 / 0")).toBeNull();
  });
});

describe("evaluateMathExpression", () => {
  const scope: Record<string, number> = { rent: 1200, utilities: 180, "monthly rent": 1000 };
  const calc: MathEvalOptions = {
    resolve: (name) => scope[name],
    percent: true,
    thousandsSeparators: true,
  };
  const value = (expression: string) => evaluateMathExpression(expression, calc)?.value ?? null;

  it("resolves names, including multi-word and case-insensitive ones", () => {
    expect(value("rent + utilities")).toBe(1380);
    expect(value("Monthly  Rent * 12")).toBe(12000);
    expect(value("RENT")).toBe(1200);
  });

  it("accepts tabs between tokens and inside multi-word names", () => {
    expect(value("rent +\tutilities")).toBe(1380);
    expect(value("monthly\trent\t*\t2")).toBe(2000);
  });

  it("fails on undefined names and implicit multiplication", () => {
    expect(value("rent + groceries")).toBeNull();
    expect(value("2 apples")).toBeNull();
  });

  it("applies percent relative to the left side of + and -", () => {
    expect(value("450 + 15%")).toBe(517.5);
    expect(value("450 - 15%")).toBe(382.5);
  });

  it("treats percent elsewhere as a plain fraction", () => {
    expect(value("200 * 15%")).toBe(30);
    expect(value("15%")).toBe(0.15);
  });

  it("supports `p% of x`", () => {
    expect(value("15% of 200")).toBe(30);
    expect(value("15% of rent + 10")).toBe(190);
  });

  it("accepts strict 3-digit thousands groups only", () => {
    expect(value("1,200 + 1")).toBe(1201);
    expect(value("12,345.6")).toBeCloseTo(12345.6);
    expect(value("1,5")).toBeNull();
    expect(value("1,20")).toBeNull();
  });

  it("flags bare literals", () => {
    for (const literal of ["1200", "-5", "15%"]) {
      expect(evaluateMathExpression(literal, calc)?.isLiteral).toBe(true);
    }
    expect(evaluateMathExpression("1+1", calc)?.isLiteral).toBe(false);
    expect(evaluateMathExpression("rent", calc)?.isLiteral).toBe(false);
  });

  it("rejects comparisons", () => {
    for (const expression of ["a == b", "a >= b", "a <= b", "a != b"]) {
      expect(evaluateMathExpression(expression, { ...calc, resolve: () => 1 })).toBeNull();
    }
  });

  it("fails on division by zero", () => {
    expect(value("rent / 0")).toBeNull();
  });
});

describe("normalizeMathName", () => {
  it("trims, collapses whitespace and lowercases", () => {
    expect(normalizeMathName("  Monthly   Rent ")).toBe("monthly rent");
  });
});
