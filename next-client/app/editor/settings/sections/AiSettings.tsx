"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { useAtom } from "jotai";
import { HiOutlineRefresh } from "react-icons/hi";
import {
  atom_aiEnabled,
  atom_aiProvider,
  atom_availableClaudeModels,
  atom_availableGeminiModels,
  atom_claudeKey,
  atom_geminiKey,
  atom_selectedAiModel,
  atom_webMcpEnabled,
} from "@/app/atoms/atoms";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";
import Toggle from "@/app/components/Toggle";
import { showErrorToast, showSuccessToast } from "@/app/components/Toastr";
import { fetchClaudeModels, fetchGeminiModels, testAIConnection } from "@/app/services/ai";
import { isWebMcpSupported } from "@/app/services/webmcp-context";
import { SegmentedControl, SelectControl, SettingGroup, SettingItem, SettingNote } from "../components/SettingControls";

// Per-provider copy, defaults, and the model list shown before the real one loads.
const PROVIDERS = {
  claude: {
    name: "Claude",
    keyDescription: "Create one at console.anthropic.com.",
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
    keyDescription: "Create one at aistudio.google.com.",
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

type Provider = keyof typeof PROVIDERS;

// WebMCP support doesn't change while the page is open.
const noSubscription = () => () => {};

// Settings → AI Features: an off-by-default switch, then (once on) the
// provider, your API key, the model loaded from the key's account and a
// connection check. Turning it off keeps the key; Remove key deletes it.
// Below, always shown, the Browser agents switch (WebMCP, off by default).
export default function AiSettings() {
  const [aiEnabled, setAiEnabled] = useAtom(atom_aiEnabled);
  const [aiProvider, setAiProvider] = useAtom(atom_aiProvider);
  const [selectedAiModel, setSelectedAiModel] = useAtom(atom_selectedAiModel);
  const [claudeKey, setClaudeKey] = useAtom(atom_claudeKey);
  const [geminiKey, setGeminiKey] = useAtom(atom_geminiKey);
  const [availableGeminiModels, setAvailableGeminiModels] = useAtom(atom_availableGeminiModels);
  const [availableClaudeModels, setAvailableClaudeModels] = useAtom(atom_availableClaudeModels);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [webMcpEnabled, setWebMcpEnabled] = useAtom(atom_webMcpEnabled);
  // Read after hydration: the server render can't know the browser.
  const webMcpSupported = useSyncExternalStore(noSubscription, isWebMcpSupported, () => false);

  const provider = PROVIDERS[aiProvider];
  const key = aiProvider === "claude" ? claudeKey : geminiKey;
  const setKey = aiProvider === "claude" ? setClaudeKey : setGeminiKey;
  const availableModels = aiProvider === "claude" ? availableClaudeModels : availableGeminiModels;
  const setAvailableModels = aiProvider === "claude" ? setAvailableClaudeModels : setAvailableGeminiModels;

  useEffect(() => {
    if (!aiEnabled || !key || availableModels.length > 0 || fetchError) return;
    const loadModels = async () => {
      setIsFetchingModels(true);
      setFetchError(null);
      try {
        setAvailableModels(await provider.fetchModels(key));
      } catch (error: any) {
        setFetchError(error.message || "Couldn't load models");
      } finally {
        setIsFetchingModels(false);
      }
    };
    loadModels();
  }, [aiEnabled, key, availableModels.length, setAvailableModels, fetchError, provider]);

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const result = await testAIConnection(aiProvider, key);
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
    setAvailableModels([]);
    setFetchError(null);
  };

  const models: ReadonlyArray<{ id: string; name: string }> =
    availableModels.length > 0 ? availableModels : provider.fallbackModels;

  return (
    <>
      <SettingGroup>
        <SettingItem
          label="AI features"
          description="Optional, and off unless you turn it on. Adds AI Chat and one-click rewrites, using your own Claude or Gemini API key."
          control={<Toggle variant="soft" active={aiEnabled} onChange={setAiEnabled} label="AI features" />}
        />
      </SettingGroup>

      {aiEnabled && (
        <SettingGroup title="Setup">
          <SettingItem
            label="Provider"
            control={
              <SegmentedControl<Provider>
                options={[{ label: "Claude", value: "claude" }, { label: "Gemini", value: "gemini" }]}
                value={aiProvider}
                onChange={(next) => {
                  setAiProvider(next);
                  setSelectedAiModel(PROVIDERS[next].defaultModel);
                }}
              />
            }
          />
          <SettingItem
            label="API key"
            description={`${provider.keyDescription} It's kept in this browser only.`}
            layout="stack"
            control={
              <div className="flex flex-col gap-1">
                <Input
                  name={aiProvider === "claude" ? "claudeKey" : "geminiKey"}
                  value={key}
                  type="password"
                  placeholder={provider.keyPlaceholder}
                  handleChange={(e) => setKey(e.target.value.trim())}
                />
                {key && (
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
                    <Button variant="secondary" onClick={removeKey} className="h-8 px-4 text-ui-footnote font-medium">
                      Remove key
                    </Button>
                  </div>
                )}
              </div>
            }
          />
          {key && (
            <SettingItem
              label="Model"
              description={
                isFetchingModels
                  ? "Loading your models…"
                  : fetchError
                    ? `Couldn't load your models (${fetchError}); showing the usual ones.`
                    : "The models your key can use."
              }
              control={
                <div className="flex items-center gap-2">
                  <SelectControl value={selectedAiModel} onChange={(v) => setSelectedAiModel(v as any)} disabled={isFetchingModels} ariaLabel="Model">
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
          <SettingNote>
            Nothing is sent until you use an AI feature. Then only what that request needs (your message, the note or
            selection) goes to {provider.name}, by way of HermesMarkdown&apos;s server, which doesn&apos;t log or keep it.
          </SettingNote>
        </SettingGroup>
      )}

      <SettingGroup title="Browser agents">
        <SettingItem
          label="Let browser agents read notes"
          description={
            webMcpSupported
              ? "AI agents built into this browser can search your notes, read one and list open tasks (WebMCP). Private notes stay hidden, and nothing is written. No key needed."
              : "For AI agents built into the browser (WebMCP). This browser doesn't offer them yet."
          }
          control={<Toggle variant="soft" active={webMcpEnabled} onChange={setWebMcpEnabled} label="Let browser agents read notes" />}
        />
      </SettingGroup>
    </>
  );
}
