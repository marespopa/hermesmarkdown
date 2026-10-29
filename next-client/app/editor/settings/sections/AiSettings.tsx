"use client";

import React, { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { HiOutlineRefresh } from "react-icons/hi";
import {
  atom_aiEnabled,
  atom_aiProvider,
  atom_availableClaudeModels,
  atom_availableGeminiModels,
  atom_availableOllamaModels,
  atom_claudeKey,
  atom_geminiKey,
  atom_ollamaBaseUrl,
  atom_ollamaKey,
  DEFAULT_OLLAMA_BASE_URL,
  atom_selectedAiModel,
  atom_aiWebSearchEnabled,
} from "@/app/atoms/atoms";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";
import Toggle from "@/app/components/Toggle";
import { showErrorToast, showSuccessToast } from "@/app/components/Toastr";
import { fetchClaudeModels, fetchGeminiModels, fetchOllamaModels, isLocalBaseUrl, testAIConnection } from "@/app/services/ai";
import { AUTO_MODEL_ID, AUTO_MODEL_LABEL } from "@/app/editor/components/ai-chat/auto-model";
import { SegmentedControl, SelectControl, SettingGroup, SettingItem, SettingNote } from "../components/SettingControls";

// Per-provider copy, defaults, and the model list shown before the real one loads.
const PROVIDERS = {
  claude: {
    name: "Claude",
    keyDescription: "Create one at console.anthropic.com.",
    keyPlaceholder: "sk-ant-...",
    fallbackModels: [
      { id: "sonnet-5", name: "Claude Sonnet 5" },
      { id: "haiku-4-5", name: "Claude 4.5 Haiku" },
      { id: "opus-4-8", name: "Claude 4.8 Opus" },
    ],
    fetchModels: fetchClaudeModels,
  },
  gemini: {
    name: "Gemini",
    keyDescription: "Create one at aistudio.google.com.",
    keyPlaceholder: "AIza...",
    fallbackModels: [
      { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash" },
      { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro (Preview)" },
      { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash-Lite" },
    ],
    fetchModels: fetchGeminiModels,
  },
  ollama: {
    name: "Ollama",
    keyDescription: "Needed for Ollama Cloud (ollama.com/settings/keys); leave empty for a local instance.",
    keyPlaceholder: "Optional",
    fallbackModels: [],
    fetchModels: fetchOllamaModels,
  },
} as const;

type Provider = keyof typeof PROVIDERS;

// Settings → AI Features: an off-by-default switch, then (once on) the
// provider, your API key (for Ollama, its base URL and an optional key), the
// model loaded from the key's account and a connection check, and for Claude, whether the companion may search the
// web (off by default). Turning it off keeps the key; Remove key deletes it.
export default function AiSettings() {
  const [aiEnabled, setAiEnabled] = useAtom(atom_aiEnabled);
  const [aiProvider, setAiProvider] = useAtom(atom_aiProvider);
  const [selectedAiModel, setSelectedAiModel] = useAtom(atom_selectedAiModel);
  const [claudeKey, setClaudeKey] = useAtom(atom_claudeKey);
  const [geminiKey, setGeminiKey] = useAtom(atom_geminiKey);
  const [availableGeminiModels, setAvailableGeminiModels] = useAtom(atom_availableGeminiModels);
  const [availableClaudeModels, setAvailableClaudeModels] = useAtom(atom_availableClaudeModels);
  const [ollamaKey, setOllamaKey] = useAtom(atom_ollamaKey);
  const [ollamaBaseUrl, setOllamaBaseUrl] = useAtom(atom_ollamaBaseUrl);
  const [availableOllamaModels, setAvailableOllamaModels] = useAtom(atom_availableOllamaModels);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useAtom(atom_aiWebSearchEnabled);

  const provider = PROVIDERS[aiProvider];
  const isOllama = aiProvider === "ollama";
  const key = aiProvider === "claude" ? claudeKey : aiProvider === "gemini" ? geminiKey : ollamaKey;
  const setKey = aiProvider === "claude" ? setClaudeKey : aiProvider === "gemini" ? setGeminiKey : setOllamaKey;
  const availableModels = aiProvider === "claude" ? availableClaudeModels : aiProvider === "gemini" ? availableGeminiModels : availableOllamaModels;
  const setAvailableModels = aiProvider === "claude" ? setAvailableClaudeModels : aiProvider === "gemini" ? setAvailableGeminiModels : setAvailableOllamaModels;
  // Ollama needs a base URL, not a key; the key is optional.
  const baseUrl = ollamaBaseUrl.trim();
  const ready = isOllama ? baseUrl.length > 0 : key.length > 0;
  const localOllama = isOllama && isLocalBaseUrl(baseUrl);

  useEffect(() => {
    if (!aiEnabled || !ready || availableModels.length > 0 || fetchError) return;
    const loadModels = async () => {
      setIsFetchingModels(true);
      setFetchError(null);
      try {
        const loaded = await provider.fetchModels(key, baseUrl);
        setAvailableModels(loaded);
        // A model the instance doesn't have is replaced by its first one.
        if (isOllama && loaded.length > 0 && selectedAiModel !== AUTO_MODEL_ID && !loaded.some((m: { id: string }) => m.id === selectedAiModel)) {
          setSelectedAiModel(loaded[0].id);
        }
      } catch (error: any) {
        setFetchError(error.message || "Couldn't load models");
      } finally {
        setIsFetchingModels(false);
      }
    };
    loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the picked model is only read, never a trigger
  }, [aiEnabled, ready, key, baseUrl, availableModels.length, setAvailableModels, fetchError, provider, isOllama]);

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const result = await testAIConnection(aiProvider, key, isOllama ? baseUrl : undefined);
      if (result.success) {
        showSuccessToast(`Connected to ${provider.name}.`);
      } else {
        showErrorToast(`Couldn't connect: ${result.error}`);
      }
    } catch (error: any) {
      showErrorToast(`Couldn't connect: ${error.message || "unknown error"}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const removeKey = () => {
    setKey("");
    if (!isOllama) setAvailableModels([]);
    setFetchError(null);
  };

  const resetUrl = () => {
    setOllamaBaseUrl(DEFAULT_OLLAMA_BASE_URL);
    setAvailableOllamaModels([]);
    setFetchError(null);
  };

  const models: ReadonlyArray<{ id: string; name: string }> =
    availableModels.length > 0 ? availableModels : provider.fallbackModels;

  return (
    <>
      <SettingGroup>
        <SettingItem
          label="AI features"
          description="Optional, and off unless you turn it on. Adds the AI companion, using your own Claude, Gemini or Ollama account."
          control={<Toggle variant="soft" active={aiEnabled} onChange={setAiEnabled} label="AI features" />}
        />
      </SettingGroup>

      {aiEnabled && (
        <>
        <SettingGroup title="Setup">
          <SettingItem
            label="Provider"
            control={
              <SegmentedControl<Provider>
                options={[{ label: "Claude", value: "claude" }, { label: "Gemini", value: "gemini" }, { label: "Ollama", value: "ollama" }]}
                value={aiProvider}
                onChange={(next) => {
                  setAiProvider(next);
                  setSelectedAiModel(AUTO_MODEL_ID);
                }}
              />
            }
          />
          {isOllama && (
            <SettingItem
              label="Base URL"
              description={
                localOllama
                  ? "A local instance is called straight from this browser. Start Ollama with OLLAMA_ORIGINS set to this site's address so the browser may reach it."
                  : "Ollama Cloud by default, or the address of your own instance."
              }
              layout="stack"
              control={
                <div className="flex flex-col gap-1">
                  <Input
                    name="ollamaBaseUrl"
                    value={ollamaBaseUrl}
                    placeholder={DEFAULT_OLLAMA_BASE_URL}
                    handleChange={(e) => {
                      setOllamaBaseUrl(e.target.value.trim());
                      setAvailableOllamaModels([]);
                      setFetchError(null);
                    }}
                  />
                  {ollamaBaseUrl !== DEFAULT_OLLAMA_BASE_URL && (
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" onClick={resetUrl} className="h-8 px-4 text-ui-footnote font-medium">
                        Reset URL
                      </Button>
                    </div>
                  )}
                </div>
              }
            />
          )}
          <SettingItem
            label={isOllama ? "API key (optional)" : "API key"}
            description={`${provider.keyDescription} It's kept in this browser only.`}
            layout="stack"
            control={
              <div className="flex flex-col gap-1">
                <Input
                  name={aiProvider === "claude" ? "claudeKey" : aiProvider === "gemini" ? "geminiKey" : "ollamaKey"}
                  value={key}
                  type="password"
                  placeholder={provider.keyPlaceholder}
                  handleChange={(e) => setKey(e.target.value.trim())}
                />
                {ready && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      disabled={isTestingConnection}
                      onClick={handleTestConnection}
                      className="h-8 px-4 text-ui-footnote font-medium"
                    >
                      {isTestingConnection && <HiOutlineRefresh className="animate-spin" />}
                      {isTestingConnection ? "Checking…" : "Test connection"}
                    </Button>
                    {key && (
                      <Button variant="secondary" onClick={removeKey} className="h-8 px-4 text-ui-footnote font-medium">
                        Remove key
                      </Button>
                    )}
                  </div>
                )}
              </div>
            }
          />
          {ready && (
            <SettingItem
              label="Model"
              description={
                isFetchingModels
                  ? "Loading your models…"
                  : fetchError
                    ? `Couldn't load your models (${fetchError});${isOllama ? "" : " showing the usual ones."}`
                    : isOllama && models.length === 0
                      ? "No models found. Pull a model first (ollama pull <model>), then refresh."
                      : isOllama
                        ? "The models this instance has."
                        : "The models your key can use."
              }
              control={
                <div className="flex items-center gap-2">
                  <SelectControl value={selectedAiModel} onChange={(v) => setSelectedAiModel(v as any)} ariaLabel="Model">
                    <option value={AUTO_MODEL_ID}>{AUTO_MODEL_LABEL}</option>
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </SelectControl>
                  <Button
                    variant="icon-small"
                    onClick={() => {
                      setAvailableModels([]);
                      setFetchError(null);
                    }}
                    title="Refresh models"
                    aria-label="Refresh models"
                  >
                    <HiOutlineRefresh size={18} className={isFetchingModels ? "animate-spin" : ""} />
                  </Button>
                </div>
              }
            />
          )}
          {aiProvider === "claude" && (
            <SettingItem
              label="Let the companion search the web"
              description="Claude can look things up online while it answers, and lists the pages it used. Searches are billed on your key, and what it searches for can quote your files. It must also be allowed in your Anthropic Console."
              control={<Toggle variant="soft" active={webSearchEnabled} onChange={setWebSearchEnabled} label="Let the companion search the web" />}
            />
          )}
          <SettingNote>
            Nothing is sent until you use an AI feature. Then only what that request needs (your message, the note or
            selection) goes to {provider.name},{" "}
            {localOllama
              ? "straight from this browser."
              : "by way of HermesMarkdown's server, which doesn't log or keep it."}
          </SettingNote>
        </SettingGroup>
        </>
      )}
    </>
  );
}
