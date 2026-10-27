"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { atom, useAtom, useAtomValue, useStore } from "jotai";
import { atom_companionAction } from "@/app/atoms/companion-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_aiProvider } from "@/app/atoms/ai-atoms";
import { beautifyAIError, callAI, isWebSearchEnabled } from "@/app/services/ai";
import { beginAiAction, dismissAiActionStatus } from "@/app/services/ai-status";
import { useChatSkills } from "../ai-chat/use-chat-skills";
import { parseCompanionCommand, summaryMessage, summaryPrompt, SUMMARY_SYSTEM } from "./companion-commands";
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
// (services/ai-status.ts) says so. /new and /compact (companion-commands.ts),
// the header's buttons and the palette's AI chat commands (atom_companionAction)
// start a new chat or replace the thread with its summary.
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

  // A summary is being written; the thread stays until it's back.
  const [compacting, setCompacting] = useState(false);
  const turnRunning = status === "submitted" || status === "streaming";
  const isBusy = turnRunning || compacting;
  const statusSeq = useRef<number | null>(null);
  useEffect(() => {
    // A summary has its own status (callAI).
    if (turnRunning && statusSeq.current === null) statusSeq.current = beginAiAction("Thinking…");
    if (!turnRunning && statusSeq.current !== null) {
      dismissAiActionStatus(statusSeq.current);
      statusSeq.current = null;
    }
    // A settled turn is saved, so a reload brings the thread back.
    if (!isBusy) saveThread(messages);
  }, [turnRunning, isBusy, messages]);

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

  // Replaces the thread with a summary of it. The thread stays as it is
  // while the summary is written (the thread shows that it is) and if it
  // fails (the AI status says why).
  const compact = useCallback(async (focus = "") => {
    const thread = companionChat().messages;
    if (!thread.length || compacting) return;
    stopTurn();
    clearError();
    setCompacting(true);
    try {
      const summary = await callAI(SUMMARY_SYSTEM, summaryPrompt(thread, focus));
      const next = [summaryMessage(summary)];
      setMessages(next);
      setActivities({});
      saveThread(next);
    } catch {
      // callAI already shows the error in the AI status; the thread is kept.
    } finally {
      setCompacting(false);
    }
  }, [compacting, stopTurn, clearError, setMessages, setActivities]);

  // The palette's New AI chat / Summarize AI chat.
  const action = useAtomValue(atom_companionAction);
  const actionSeq = action?.seq;
  useEffect(() => {
    if (!action) return;
    if (action.kind === "new") newChat();
    else void compact();
    // Only a new request (seq), not a re-render of the same one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionSeq]);

  const send = useCallback(async (text: string, context: CompanionContext) => {
    const command = parseCompanionCommand(text);
    if (command?.kind === "new") return newChat();
    if (command?.kind === "compact") return compact(command.focus);
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
  }, [skillList, commandSkill, store, sendMessage, clearError, newChat, compact]);

  const errorText = error ? beautifyAIError(error.message || "The AI request failed.") : null;

  return { messages, status, isBusy, compacting, errorText, activities, send, stop: stopTurn, newChat, compact, undoTurn };
}
