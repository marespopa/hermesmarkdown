import { useEffect, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  atom_aiProvider,
  atom_availableClaudeModels,
  atom_availableGeminiModels,
  atom_availableOllamaModels,
  atom_claudeKey,
  atom_geminiKey,
  atom_ollamaBaseUrl,
  atom_ollamaKey,
  atom_selectedAiModel,
} from "@/app/atoms/ui-atoms";
import { fetchClaudeModels, fetchGeminiModels, fetchOllamaModels } from "@/app/services/ai";
import { FALLBACK_CLAUDE_MODELS, FALLBACK_GEMINI_MODELS, FALLBACK_OLLAMA_MODELS } from "./chat-helpers";

// Model picker state for the AI companion. Loads the real model list on first open,
// the same lookup Settings uses — shared through the atoms, so it only
// happens once per session either way.
export function useChatModels(isOpen: boolean) {
  const aiProvider = useAtomValue(atom_aiProvider);
  const [selectedAiModel, setSelectedAiModel] = useAtom(atom_selectedAiModel);
  const claudeKey = useAtomValue(atom_claudeKey);
  const geminiKey = useAtomValue(atom_geminiKey);
  const [availableClaudeModels, setAvailableClaudeModels] = useAtom(atom_availableClaudeModels);
  const [availableGeminiModels, setAvailableGeminiModels] = useAtom(atom_availableGeminiModels);
  const ollamaKey = useAtomValue(atom_ollamaKey);
  const ollamaBaseUrl = useAtomValue(atom_ollamaBaseUrl);
  const [availableOllamaModels, setAvailableOllamaModels] = useAtom(atom_availableOllamaModels);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  const modelOptions = aiProvider === "claude"
    ? (availableClaudeModels.length > 0 ? availableClaudeModels : FALLBACK_CLAUDE_MODELS)
    : aiProvider === "ollama"
    ? (availableOllamaModels.length > 0 ? availableOllamaModels : FALLBACK_OLLAMA_MODELS)
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
    } else if (aiProvider === "ollama" && ollamaBaseUrl && availableOllamaModels.length === 0) {
      setIsFetchingModels(true);
      fetchOllamaModels(ollamaKey, ollamaBaseUrl)
        .then(setAvailableOllamaModels)
        .catch(() => {})
        .finally(() => setIsFetchingModels(false));
    }
  }, [isOpen, aiProvider, claudeKey, geminiKey, ollamaKey, ollamaBaseUrl, availableClaudeModels.length, availableGeminiModels.length, availableOllamaModels.length, setAvailableClaudeModels, setAvailableGeminiModels, setAvailableOllamaModels]);

  return { modelOptions, selectedAiModel, setSelectedAiModel, isFetchingModels };
}
