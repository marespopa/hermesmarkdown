import { describe, expect, it } from "vitest";
import { evaluateMath } from "./math-eval";

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
});
