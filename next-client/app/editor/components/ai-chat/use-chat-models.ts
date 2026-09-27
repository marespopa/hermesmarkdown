import { useEffect, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  atom_aiProvider,
  atom_availableClaudeModels,
  atom_availableGeminiModels,
  atom_claudeKey,
  atom_geminiKey,
  atom_selectedAiModel,
} from "@/app/atoms/ui-atoms";
import { fetchClaudeModels, fetchGeminiModels } from "@/app/services/ai";
import { FALLBACK_CLAUDE_MODELS, FALLBACK_GEMINI_MODELS } from "./chat-helpers";

// Model picker state for AI Chat. Loads the real model list on first open,
// the same lookup Settings uses — shared through the atoms, so it only
// happens once per session either way.
export function useChatModels(isOpen: boolean) {
  const aiProvider = useAtomValue(atom_aiProvider);
  const [selectedAiModel, setSelectedAiModel] = useAtom(atom_selectedAiModel);
  const claudeKey = useAtomValue(atom_claudeKey);
  const geminiKey = useAtomValue(atom_geminiKey);
  const [availableClaudeModels, setAvailableClaudeModels] = useAtom(atom_availableClaudeModels);
  const [availableGeminiModels, setAvailableGeminiModels] = useAtom(atom_availableGeminiModels);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  const modelOptions = aiProvider === "claude"
    ? (availableClaudeModels.length > 0 ? availableClaudeModels : FALLBACK_CLAUDE_MODELS)
    : (availableGeminiModels.length > 0 ? availableGeminiModels : FALLBACK_GEMINI_MODELS);

  useEffect(() => {
    if (!isOpen) return;
    if (aiProvider === "claude" && claudeKey && availableClaudeModels.length === 0) {
      setIsFetchingModels(true);
      fetchClaudeModels(claudeKey)
        .then(setAvailableClaudeModels)
        .catch(() => {})
        .finally(() => setIsFetchingModels(false));
    } else if (aiProvider === "gemini" && geminiKey && availableGeminiModels.length === 0) {
      setIsFetchingModels(true);
      fetchGeminiModels(geminiKey)
        .then(setAvailableGeminiModels)
        .catch(() => {})
        .finally(() => setIsFetchingModels(false));
    }
  }, [isOpen, aiProvider, claudeKey, geminiKey, availableClaudeModels.length, availableGeminiModels.length, setAvailableClaudeModels, setAvailableGeminiModels]);

  return { modelOptions, selectedAiModel, setSelectedAiModel, isFetchingModels };
}
