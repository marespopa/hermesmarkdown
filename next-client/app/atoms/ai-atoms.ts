import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

// AI Features
export type AIProvider = "claude" | "gemini" | "ollama";
export const atom_aiProvider = atomWithStorage<AIProvider>(
  "hermes_ai_provider",
  "claude",
);
export const atom_claudeKey = atomWithStorage<string>("hermes_claude_key", "");
export const atom_geminiKey = atomWithStorage<string>("hermes_gemini_key", "");
// Ollama: the key is optional (a local instance has none); the base URL is
// what makes it usable. Ollama Cloud is the default.
export const DEFAULT_OLLAMA_BASE_URL = "https://ollama.com";
export const atom_ollamaKey = atomWithStorage<string>("hermes_ollama_key", "");
export const atom_ollamaBaseUrl = atomWithStorage<string>("hermes_ollama_base_url", DEFAULT_OLLAMA_BASE_URL);

// The AI Features switch. Off until turned on; never stored (null) reads as
// on when a key was saved before the switch existed, so those setups keep working.
const atom_aiEnabledStored = atomWithStorage<boolean | null>("hermes_ai_enabled", null);
export const atom_aiEnabled = atom(
  (get) => get(atom_aiEnabledStored) ?? (get(atom_claudeKey).trim().length > 0 || get(atom_geminiKey).trim().length > 0 || get(atom_ollamaKey).trim().length > 0),
  (_get, set, enabled: boolean) => set(atom_aiEnabledStored, enabled),
);

// Let the AI companion search the web (Claude's own web search, run by
// Anthropic and billed on the user's key). Off until turned on; read per
// request by companion-chat-store.ts (getAIConfig's webSearch).
export const atom_aiWebSearchEnabled = atomWithStorage<boolean>("hermes_ai_web_search", false);

export const atom_isAiConfigured = atom((get) => {
  if (!get(atom_aiEnabled)) return false;
  const provider = get(atom_aiProvider);
  if (provider === "ollama") return get(atom_ollamaBaseUrl).trim().length > 0;
  const key = provider === "gemini" ? get(atom_geminiKey) : get(atom_claudeKey);
  return key.trim().length > 0;
});
