import type { AIProvider } from "@/app/atoms/ai-atoms";

// Auto, the companion's default model choice: each message goes to a fast,
// balanced or deep model by how hard it looks. Pure and synchronous, so the
// choice never delays a send.
export type Tier = "fast" | "balanced" | "deep";
export const AUTO_MODEL_ID = "auto";
export const AUTO_MODEL_LABEL = "Auto (picks by task)";

// Tunable in one place.
export const LONG_PROMPT_CHARS = 600;
export const LONG_CONTEXT_CHARS = 8_000;
export const DEEP_SCORE = 3;
export const BALANCED_SCORE = 1;
const HARD_WORDS = /\b(refactor|restructure|analy[sz]e|plan|compare|organi[sz]e)\b|```/i;
const EASY_WORDS = /\b(typo|rename|summari[sz]e|translate|fix grammar)\b/i;

export interface AutoSignals {
  prompt: string;
  // Attached note text, selection and mentions.
  contextChars: number;
  hasAttachments: boolean;
  // Consecutive regenerations of this turn.
  retries: number;
  // A command that always runs at one tier wins over the score.
  fixedTier?: Tier;
}

export function scoreTask({ prompt, contextChars, hasAttachments, retries }: AutoSignals): number {
  let score = 0;
  if (prompt.length > LONG_PROMPT_CHARS) score += 1;
  if (contextChars > LONG_CONTEXT_CHARS) score += 1;
  if (hasAttachments) score += 1;
  if (HARD_WORDS.test(prompt)) score += 2;
  if (EASY_WORDS.test(prompt)) score -= 1;
  return score + retries;
}

export function pickTier(signals: AutoSignals): Tier {
  if (signals.fixedTier) return signals.fixedTier;
  const score = scoreTask(signals);
  return score >= DEEP_SCORE ? "deep" : score >= BALANCED_SCORE ? "balanced" : "fast";
}

const TIERS: Tier[] = ["fast", "balanced", "deep"];

// Kept in step with FALLBACK_*_MODELS (chat-helpers.ts) and providers.ts.
const FIXED_MODELS: Record<"claude" | "gemini", Record<Tier, string>> = {
  claude: { fast: "haiku-4-5", balanced: "sonnet-5", deep: "opus-4-8" },
  gemini: { fast: "gemini-3.1-flash-lite", balanced: "gemini-3.5-flash", deep: "gemini-3.1-pro" },
};

// Parameter count in billions from an id or tag ("llama3:8b", "qwen3:32b");
// null when there is none.
export function modelSize(id: string): number | null {
  const match = id.match(/(\d+(?:\.\d+)?)\s*([bm])\b/i);
  if (!match) return null;
  const size = parseFloat(match[1]);
  return match[2].toLowerCase() === "m" ? size / 1000 : size;
}

// Sized models ascending; unsized ones keep list order, after them.
function bySize(models: { id: string }[]): { id: string }[] {
  const sized = models.map((m, i) => ({ m, i, size: modelSize(m.id) }));
  return sized
    .sort((a, b) => (a.size ?? Infinity) - (b.size ?? Infinity) || a.i - b.i)
    .map((entry) => entry.m);
}

// The model id Auto uses for a provider at a tier, from the models it has.
// "" when there is none to pick (an Ollama instance with nothing pulled).
export function resolveAutoModel(provider: AIProvider, tier: Tier, available: { id: string; name?: string }[]): string {
  if (provider === "ollama") {
    const ordered = bySize(available);
    if (!ordered.length) return "";
    return ordered[tier === "fast" ? 0 : tier === "deep" ? ordered.length - 1 : Math.floor((ordered.length - 1) / 2)].id;
  }
  const wanted = FIXED_MODELS[provider][tier];
  // No live list yet: trust the known id.
  if (!available.length || available.some((m) => m.id === wanted)) return wanted;
  // The list lacks it: step to the nearest tier it has.
  const from = TIERS.indexOf(tier);
  const order = TIERS.slice().sort((a, b) => Math.abs(TIERS.indexOf(a) - from) - Math.abs(TIERS.indexOf(b) - from));
  const found = order.map((t) => FIXED_MODELS[provider][t]).find((id) => available.some((m) => m.id === id));
  return found ?? wanted;
}
