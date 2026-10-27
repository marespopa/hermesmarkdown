import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

// AI Features
export type AIProvider = "claude" | "gemini";
export const atom_aiProvider = atomWithStorage<AIProvider>(
  "hermes_ai_provider",
  "claude",
);
export const atom_claudeKey = atomWithStorage<string>("hermes_claude_key", "");
export const atom_geminiKey = atomWithStorage<string>("hermes_gemini_key", "");

// The AI Features switch. Off until turned on; never stored (null) reads as
// on when a key was saved before the switch existed, so those setups keep working.
const atom_aiEnabledStored = atomWithStorage<boolean | null>("hermes_ai_enabled", null);
export const atom_aiEnabled = atom(
  (get) => get(atom_aiEnabledStored) ?? (get(atom_claudeKey).trim().length > 0 || get(atom_geminiKey).trim().length > 0),
  (_get, set, enabled: boolean) => set(atom_aiEnabledStored, enabled),
);

// Browser agents (WebMCP): let AI agents in this browser use the read-only
// note tools. Off until turned on; separate from AI Features (no key needed).
export const atom_webMcpEnabled = atomWithStorage<boolean>("hermes_webmcp_enabled", false);

export const atom_isAiConfigured = atom((get) => {
  if (!get(atom_aiEnabled)) return false;
  const provider = get(atom_aiProvider);
  const key = provider === "gemini" ? get(atom_geminiKey) : get(atom_claudeKey);
  return key.trim().length > 0;
});
