import { describe, it, expect } from "vitest";
import { runAutoBudget } from "./budget";

describe("runAutoBudget", () => {
  it("sums up values and updates Total:", () => {
    const input = "$10\n$20\nTotal: $0";
    const expected = "$10\n$20\nTotal: $30.00";
    expect(runAutoBudget(input)).toBe(expected);
  });

  it("handles commas and decimals", () => {
    const input = "$1,000.50\n$500\nTotal: $0";
    const expected = "$1,000.50\n$500\nTotal: $1,500.50";
    expect(runAutoBudget(input)).toBe(expected);
  });

  it("resets sum after each Total:", () => {
    const input = "$10\nTotal: $0\n$20\nTotal: $0";
    const expected = "$10\nTotal: $10.00\n$20\nTotal: $20.00";
    expect(runAutoBudget(input)).toBe(expected);
  });

  it("preserves leading whitespace on Total: lines", () => {
    const input = "$10\n  Total: $0";
    const expected = "$10\n  Total: $10.00";
    expect(runAutoBudget(input)).toBe(expected);
  });

  it("returns exact same string if no values changed", () => {
    const input = "$10\nTotal: $10.00";
    // Using toBe to ensure reference equality (or at least identical string)
    expect(runAutoBudget(input)).toBe(input);
  });

  it("handles different currency codes", () => {
    const input = "€10\n€20\nTotal: €0";
    const expected = "€10\n€20\nTotal: €30.00";
    expect(runAutoBudget(input, "EUR")).toBe(expected);
  });

  it("handles negative values", () => {
    const input = "$10\n-$5\nTotal: $0";
    const expected = "$10\n-$5\nTotal: $5.00";
    expect(runAutoBudget(input)).toBe(expected);
  });
});
