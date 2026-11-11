// API list prices for the token cost calculator (/tools/token-cost-calculator)
// and the editor's Token cost dialog, in US dollars per million tokens, at
// standard rates (no batch or cache discounts, short-context tier). Prices
// change often: update the table and PRICES_AS_OF together.
//
// Checked against the providers' own pricing pages on 2026-11-11. Scheduled
// changes to revisit: Gemini 4 Argon goes from $2 / $10 to $4 / $20 on
// 2026-12-01, and Gemini 3.8 Flash from $0.75 / $3.75 to $1.50 / $7.50 on
// 2027-01-01. Haiku 5.5 is listed at its up-to-100K-token rate (it costs
// $0.50 / $2.50 above that), and OpenAI models cost about double above 272K
// input tokens.

export const PRICES_AS_OF = "November 2026";

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
  { id: "gpt-6-astra", name: "GPT-6 Astra", provider: "OpenAI", input: 10, output: 50 },
  { id: "gpt-6.1-sol", name: "GPT-6.1 Sol", provider: "OpenAI", input: 2, output: 10 },
  { id: "gpt-6.1-terra", name: "GPT-6.1 Terra", provider: "OpenAI", input: 1, output: 5 },
  { id: "gpt-6-luna", name: "GPT-6 Luna", provider: "OpenAI", input: 0.1, output: 0.5 },
  { id: "gpt-5.5", name: "GPT-5.5", provider: "OpenAI", input: 5, output: 30 },
  { id: "gpt-5.4-mini", name: "GPT-5.4 mini", provider: "OpenAI", input: 0.75, output: 4.5 },
  { id: "claude-fable-5-2", name: "Claude Fable 5.2", provider: "Anthropic", input: 8, output: 40 },
  { id: "claude-opus-5-5", name: "Claude Opus 5.5", provider: "Anthropic", input: 4, output: 20 },
  { id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", provider: "Anthropic", input: 2, output: 10 },
  { id: "claude-haiku-5-5", name: "Claude Haiku 5.5", provider: "Anthropic", input: 0.1, output: 0.5 },
  { id: "gemini-4-argon", name: "Gemini 4 Argon", provider: "Google", input: 2, output: 10 },
  { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro", provider: "Google", input: 2, output: 12 },
  { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", provider: "Google", input: 0.75, output: 3.75 },
  { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash-Lite", provider: "Google", input: 0.3, output: 2.5 },
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
