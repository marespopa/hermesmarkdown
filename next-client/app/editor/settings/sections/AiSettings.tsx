"use client";

import React, { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { HiOutlineRefresh } from "react-icons/hi";
import {
  atom_aiProvider,
  atom_availableClaudeModels,
  atom_availableGeminiModels,
  atom_claudeKey,
  atom_geminiKey,
  atom_selectedAiModel,
} from "@/app/atoms/atoms";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";
import { showErrorToast, showSuccessToast } from "@/app/components/Toastr";
import { fetchClaudeModels, fetchGeminiModels, testAIConnection } from "@/app/services/ai";
import { SelectControl, SettingGroup, SettingItem } from "../components/SettingControls";

// Per-provider copy, defaults, and the model list shown before the real one loads.
const PROVIDERS = {
  claude: {
    name: "Claude",
    keyLabel: "Claude API Key",
    keyDescription: "Your Anthropic API key. Remove it to disable AI features for this provider.",
    keyPlaceholder: "sk-ant-...",
    defaultModel: "sonnet-5",
    fallbackModels: [
      { id: "sonnet-5", name: "Claude Sonnet 5" },
      { id: "haiku-4-5", name: "Claude 4.5 Haiku" },
      { id: "opus-4-8", name: "Claude 4.8 Opus" },
    ],
    fetchModels: fetchClaudeModels,
  },
  gemini: {
    name: "Gemini",
    keyLabel: "Gemini API Key",
    keyDescription: "Your Google AI Studio API key. Remove it to disable AI features for this provider.",
    keyPlaceholder: "AIza...",
    defaultModel: "gemini-3.5-flash",
    fallbackModels: [
      { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash" },
      { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro (Preview)" },
      { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash-Lite" },
    ],
    fetchModels: fetchGeminiModels,
  },
} as const;

// Settings → AI Features: provider, model (loaded from the key's account,
// with a refresh button), API key with removal, and a connection test.
export default function AiSettings() {
  const [aiProvider, setAiProvider] = useAtom(atom_aiProvider);
  const [selectedAiModel, setSelectedAiModel] = useAtom(atom_selectedAiModel);
  const [claudeKey, setClaudeKey] = useAtom(atom_claudeKey);
  const [geminiKey, setGeminiKey] = useAtom(atom_geminiKey);
  const [availableGeminiModels, setAvailableGeminiModels] = useAtom(atom_availableGeminiModels);
  const [availableClaudeModels, setAvailableClaudeModels] = useAtom(atom_availableClaudeModels);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const provider = PROVIDERS[aiProvider];
  const key = aiProvider === "claude" ? claudeKey : geminiKey;
  const setKey = aiProvider === "claude" ? setClaudeKey : setGeminiKey;
  const availableModels = aiProvider === "claude" ? availableClaudeModels : availableGeminiModels;
  const setAvailableModels = aiProvider === "claude" ? setAvailableClaudeModels : setAvailableGeminiModels;

  useEffect(() => {
    if (!key || availableModels.length > 0 || fetchError) return;
    const loadModels = async () => {
      setIsFetchingModels(true);
      setFetchError(null);
      try {
        setAvailableModels(await provider.fetchModels(key));
      } catch (error: any) {
        setFetchError(error.message || "Failed to load models");
      } finally {
        setIsFetchingModels(false);
      }
    };
    loadModels();
  }, [key, availableModels.length, setAvailableModels, fetchError, provider]);

  const handleTestConnection = async () => {
    if (!key) {
      showErrorToast(`Please enter your ${provider.name} API key first.`);
      return;
    }
    setIsTestingConnection(true);
    try {
      const result = await testAIConnection(aiProvider, key);
      if (result.success) {
        showSuccessToast(`Connection to ${provider.name} successful!`);
      } else {
        showErrorToast(`Failed to connect: ${result.error}`);
      }
    } catch (error: any) {
      showErrorToast(`An error occurred: ${error.message || "Unknown error"}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const removeAiKey = () => {
    setKey("");
    setAvailableModels([]);
    setFetchError(null);
  };

  const models: ReadonlyArray<{ id: string; name: string }> =
    availableModels.length > 0 ? availableModels : provider.fallbackModels;

  return (
    <SettingGroup title="Provider Config">
      <SettingItem
        label="AI Provider"
        description="Choose the model used for AI features."
        control={
          <SelectControl
            value={aiProvider}
            onChange={(v) => {
              const next = v as keyof typeof PROVIDERS;
              setAiProvider(next);
              // Reset selected model to the provider's default
              setSelectedAiModel(PROVIDERS[next].defaultModel);
            }}
          >
            <option value="claude">Claude (Anthropic)</option>
            <option value="gemini">Gemini (Google)</option>
          </SelectControl>
        }
      />
      <SettingItem
        label="Model Tier"
        description={
          isFetchingModels
            ? "Fetching available models..."
            : fetchError
              ? `Error: ${fetchError}`
              : "Choose from models available to your API key."
        }
        control={
          <div className="flex items-center gap-2">
            <SelectControl value={selectedAiModel} onChange={(v) => setSelectedAiModel(v as any)} disabled={isFetchingModels}>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </SelectControl>
            <Button
              variant="unstyled"
              onClick={() => {
                setAvailableModels([]);
                setFetchError(null);
              }}
              className="p-1.5 text-stone hover:text-sage transition-colors"
              title="Refresh models"
              aria-label="Refresh models"
            >
              <HiOutlineRefresh size={18} className={isFetchingModels ? "animate-spin" : ""} />
            </Button>
          </div>
        }
      />
      <SettingItem
        label={provider.keyLabel}
        description={provider.keyDescription}
        layout="stack"
        control={
          <div className="flex flex-col gap-2">
            <Input
              name={aiProvider === "claude" ? "claudeKey" : "geminiKey"}
              value={key}
              type="password"
              placeholder={provider.keyPlaceholder}
              handleChange={(e) => setKey(e.target.value.trim())}
            />
            <Button
              variant="secondary"
              onClick={removeAiKey}
              disabled={!key}
              className="h-8 self-start px-3 text-ui-footnote text-red-500 hover:bg-red-500/10 disabled:text-fg-faint"
            >
              Remove AI key
            </Button>
          </div>
        }
      />
      <div className="pt-2 pb-4">
        <Button
          variant="secondary"
          disabled={isTestingConnection}
          onClick={handleTestConnection}
          className="w-full flex items-center justify-center gap-2 h-11"
        >
          {isTestingConnection ? (
            <>
              <HiOutlineRefresh className="animate-spin" />
              Testing...
            </>
          ) : (
            "Test Connection"
          )}
        </Button>
      </div>
    </SettingGroup>
  );
}
