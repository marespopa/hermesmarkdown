import { describe, expect, it } from "vitest";
import { MAX_OUTPUT_TOKENS, MODEL_PRICES, formatUsd, isExactCount, modelCost, parseTokenCount } from "./model-prices";

const model = { id: "m", name: "Model", provider: "Anthropic" as const, input: 3, output: 15 };

describe("modelCost", () => {
  it("prices input and output per million tokens", () => {
    expect(modelCost(model, 2_000_000, 100_000)).toEqual({ model, input: 6, output: 1.5, total: 7.5 });
    expect(modelCost(model, 0, 0).total).toBe(0);
  });
});

describe("formatUsd", () => {
  it("shows cents from a cent up and two significant digits below", () => {
    expect(formatUsd(0)).toBe("$0");
    expect(formatUsd(1234.5)).toBe("$1,234.50");
    expect(formatUsd(0.01)).toBe("$0.01");
    expect(formatUsd(0.000123)).toBe("$0.00012");
  });
});

describe("parseTokenCount", () => {
  it("keeps whole, non-negative counts up to the limit", () => {
    expect(parseTokenCount("1500")).toBe(1500);
    expect(parseTokenCount("12.7")).toBe(12);
    expect(parseTokenCount("-5")).toBe(0);
    expect(parseTokenCount("")).toBe(0);
    expect(parseTokenCount("abc")).toBe(0);
    expect(parseTokenCount("1e12")).toBe(MAX_OUTPUT_TOKENS);
  });
});

describe("MODEL_PRICES", () => {
  it("has unique ids, positive prices and exact counts only for OpenAI", () => {
    expect(new Set(MODEL_PRICES.map((entry) => entry.id)).size).toBe(MODEL_PRICES.length);
    for (const entry of MODEL_PRICES) {
      expect(entry.input).toBeGreaterThan(0);
      expect(entry.output).toBeGreaterThan(0);
      expect(isExactCount(entry)).toBe(entry.provider === "OpenAI");
    }
  });
});
