"use client";

import React, { useState } from "react";
import { useAtom } from "jotai";
import { HiOutlineCheckCircle, HiOutlineLightningBolt } from "react-icons/hi";
import { atom_aiProvider, atom_claudeKey, atom_geminiKey } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";
import { showErrorToast, showSuccessToast } from "@/app/components/Toastr";
import { SelectControl } from "@/app/editor/settings/components/SettingControls";
import { testAIConnection } from "@/app/services/ai";

// Step 7 (optional): pick an AI provider, paste a key, and test it.
export default function AiKeyStep({ onContinue }: { onContinue: () => void }) {
  const [aiProvider, setAiProvider] = useAtom(atom_aiProvider);
  const [claudeKey, setClaudeKey] = useAtom(atom_claudeKey);
  const [geminiKey, setGeminiKey] = useAtom(atom_geminiKey);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isConnectionSuccessful, setIsConnectionSuccessful] = useState(false);

  const key = aiProvider === "gemini" ? geminiKey : claudeKey;
  const setKey = aiProvider === "gemini" ? setGeminiKey : setClaudeKey;

  const testConnection = async () => {
    setIsTestingConnection(true);
    const result = await testAIConnection(aiProvider, key.trim());
    setIsTestingConnection(false);
    if (result.success) {
      setIsConnectionSuccessful(true);
      showSuccessToast("Connection successful.");
    } else {
      showErrorToast(result.error || "Connection failed.");
    }
  };

  return (
    <div className="flex flex-col items-center text-center space-y-4 py-2">
      <div className="w-12 h-12 bg-sage/10 rounded-2xl flex items-center justify-center text-sage shrink-0">
        <HiOutlineLightningBolt size={24} />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-ui-title-3 font-bold">AI Features (optional)</h2>
        <p className="text-ui-footnote opacity-60 px-4">
          Bring your own API key to unlock rewriting, summarizing, and chat.
          Stored locally in your browser only — never sent to us. Skip this
          anytime and add it later in Settings.
        </p>
      </div>

      <div className="w-full rounded-2xl border border-edge p-3.5 space-y-2.5 bg-paper-softgray/40 dark:bg-paper-dark/30 text-left">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider ml-1 opacity-70 block">Provider</label>
          <SelectControl
            value={aiProvider}
            onChange={(value) => {
              setAiProvider(value as typeof aiProvider);
              setIsConnectionSuccessful(false);
            }}
          >
            <option value="claude">Claude (Anthropic)</option>
            <option value="gemini">Gemini (Google)</option>
          </SelectControl>
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider ml-1 opacity-70 block">API Key</label>
          <Input
            name="welcome-ai-key"
            type="password"
            value={key}
            handleChange={(event) => {
              setKey(event.target.value);
              setIsConnectionSuccessful(false);
            }}
            placeholder={aiProvider === "gemini" ? "AIza..." : "sk-ant-..."}
          />
        </div>
        {isConnectionSuccessful ? (
          <div className="w-full h-9 rounded-xl bg-sage/10 text-sage flex items-center justify-center gap-1.5 text-ui-footnote font-semibold" role="status">
            <HiOutlineCheckCircle size={17} />
            Connection successful.
          </div>
        ) : (
          <Button
            variant="secondary"
            disabled={!key.trim() || isTestingConnection}
            onClick={() => void testConnection()}
            className="w-full h-9 rounded-xl text-ui-footnote font-semibold"
          >
            {isTestingConnection ? "Testing…" : "Test Connection"}
          </Button>
        )}
      </div>

      <Button variant="primary" onClick={onContinue} className="w-full h-11 rounded-2xl text-ui-footnote font-bold shrink-0">
        Continue
      </Button>
    </div>
  );
}
