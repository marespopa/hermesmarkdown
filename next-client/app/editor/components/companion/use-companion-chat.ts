"use client";

import { useCallback, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { atom, useAtom, useStore } from "jotai";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_aiProvider } from "@/app/atoms/ai-atoms";
import { beautifyAIError, isWebSearchEnabled } from "@/app/services/ai";
import { beginAiAction, dismissAiActionStatus } from "@/app/services/ai-status";
import { useChatSkills } from "../ai-chat/use-chat-skills";
import { companionChat, companionHandlers, saveThread } from "./companion-chat-store";
import { buildCompanionSystemPrompt } from "./companion-prompt";
import { userTurn, type CompanionContext } from "./companion-messages";
import { declineAllTrash } from "./trash-confirm";
import { useCompanionTools } from "./use-companion-tools";

// What each tool call's chip says once it ran (by toolCallId), for the session.
const atom_toolActivities = atom<Record<string, string>>({});

// The companion's conversation (companion-chat-store.ts holds it): useChat
// on the one Chat instance, streaming from /api/ai/companion, with tool
// calls run in the browser (useCompanionTools) and answered at once, the
// loop resent until the model answers or MAX_TOOL_ROUNDS. The thread is
// saved whenever a turn settles. While a turn runs, the app's AI status
// (services/ai-status.ts) says so.
export function useCompanionChat() {
  const store = useStore();
  const { runTool, undoTurn } = useCompanionTools();
  const { skillList, commandSkill } = useChatSkills();
  const [activities, setActivities] = useAtom(atom_toolActivities);

  useEffect(() => {
    companionHandlers.runToolCall = async ({ toolName, toolCallId, input }, turnId) => {
      const { output, activity } = await runTool({ toolName, input, toolCallId }, turnId);
      setActivities((prev) => ({ ...prev, [toolCallId]: activity }));
      return output;
    };
  }, [runTool, setActivities]);

  const { messages, sendMessage, status, stop, setMessages, error, clearError } = useChat({ chat: companionChat() });

  const isBusy = status === "submitted" || status === "streaming";
  const statusSeq = useRef<number | null>(null);
  useEffect(() => {
    if (isBusy && statusSeq.current === null) statusSeq.current = beginAiAction("Thinking…");
    if (!isBusy && statusSeq.current !== null) {
      dismissAiActionStatus(statusSeq.current);
      statusSeq.current = null;
    }
    // A settled turn is saved, so a reload brings the thread back.
    if (!isBusy) saveThread(messages);
  }, [isBusy, messages]);

  const send = useCallback(async (text: string, context: CompanionContext) => {
    // A message starting with a skill's /command carries the skill; other
    // skills the model loads itself (load_skill).
    const skill = await commandSkill(text);
    companionHandlers.system = buildCompanionSystemPrompt({
      hasVault: !!store.get(atom_vaultHandle),
      webSearch: isWebSearchEnabled() && store.get(atom_aiProvider) === "claude",
      skills: skillList(),
    });
    clearError();
    await sendMessage(userTurn(text, context, skill ?? undefined));
  }, [skillList, commandSkill, store, sendMessage, clearError]);

  // Stopping keeps any files a waiting trash call would move.
  const stopTurn = useCallback(() => {
    declineAllTrash(store);
    void stop();
  }, [store, stop]);

  const newChat = useCallback(() => {
    stopTurn();
    setMessages([]);
    setActivities({});
    clearError();
    saveThread([]);
  }, [stopTurn, setMessages, setActivities, clearError]);

  const errorText = error ? beautifyAIError(error.message || "The AI request failed.") : null;

  return { messages, status, isBusy, errorText, activities, send, stop: stopTurn, newChat, undoTurn };
}
