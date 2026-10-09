// API list prices for the token cost calculator (/tools/token-cost-calculator)
// and the editor's Token cost dialog, in US dollars per million tokens, at
// standard rates (no batch or cache discounts, short-context tier). Prices
// change often: update the table and PRICES_AS_OF together.

export const PRICES_AS_OF = "October 2026";

export type ModelProvider = "OpenAI" | "Anthropic" | "Google";

export interface ModelPrice {
  id: string;
  name: string;
  provider: ModelProvider;
  // Dollars per 1M tokens.
  input: number;
  output: number;
}

export const MODEL_PRICES: ModelPrice[] = [
  { id: "gpt-5.5", name: "GPT-5.5", provider: "OpenAI", input: 5, output: 30 },
  { id: "gpt-5.4", name: "GPT-5.4", provider: "OpenAI", input: 2.5, output: 15 },
  { id: "gpt-5-mini", name: "GPT-5 mini", provider: "OpenAI", input: 0.25, output: 2 },
  { id: "gpt-5-nano", name: "GPT-5 nano", provider: "OpenAI", input: 0.05, output: 0.4 },
  { id: "claude-fable-5-1", name: "Claude Fable 5.1", provider: "Anthropic", input: 10, output: 50 },
  { id: "claude-opus-5-5", name: "Claude Opus 5.5", provider: "Anthropic", input: 4, output: 20 },
  { id: "claude-sonnet-5", name: "Claude Sonnet 5", provider: "Anthropic", input: 3, output: 15 },
  { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", provider: "Anthropic", input: 1, output: 5 },
  { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro", provider: "Google", input: 2, output: 12 },
  { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", provider: "Google", input: 1.5, output: 9 },
  { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash-Lite", provider: "Google", input: 0.25, output: 1.5 },
];

// Counts come from OpenAI's o200k tokenizer, so they are exact for OpenAI
// models and an estimate for the others, whose tokenizers differ.
export const isExactCount = (model: ModelPrice) => model.provider === "OpenAI";

export interface ModelCost {
  model: ModelPrice;
  input: number;
  output: number;
  total: number;
}

export function modelCost(model: ModelPrice, inputTokens: number, outputTokens: number): ModelCost {
  const input = (inputTokens / 1_000_000) * model.input;
  const output = (outputTokens / 1_000_000) * model.output;
  return { model, input, output, total: input + output };
}

// Dollars with enough precision to tell small amounts apart: two decimals
// from a cent up, otherwise two significant digits, so a short note doesn't
// read as $0.00.
export function formatUsd(amount: number): string {
  if (amount === 0) return "$0";
  if (amount >= 0.01) {
    return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${amount.toLocaleString("en-US", { maximumSignificantDigits: 2 })}`;
}

export const MAX_OUTPUT_TOKENS = 10_000_000;

// A typed token count: a whole number from 0 to MAX_OUTPUT_TOKENS; anything
// else (empty, negative, not a number) is 0.
export function parseTokenCount(value: string): number {
  const count = Math.floor(Number(value));
  return Number.isFinite(count) ? Math.min(MAX_OUTPUT_TOKENS, Math.max(0, count)) : 0;
}
