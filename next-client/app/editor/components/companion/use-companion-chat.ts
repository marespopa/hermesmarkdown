"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { atom, useAtom, useAtomValue, useStore } from "jotai";
import { atom_companionAction, atom_companionProposals } from "@/app/atoms/companion-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_aiProvider } from "@/app/atoms/ai-atoms";
import {
  atom_availableClaudeModels,
  atom_availableGeminiModels,
  atom_availableOllamaModels,
  atom_selectedAiModel,
} from "@/app/atoms/ui-atoms";
import { beautifyAIError, callAI, isWebSearchEnabled } from "@/app/services/ai";
import { beginAiAction, dismissAiActionStatus } from "@/app/services/ai-status";
import { AUTO_MODEL_ID, pickTier, resolveAutoModel } from "../ai-chat/auto-model";
import { FALLBACK_CLAUDE_MODELS, FALLBACK_GEMINI_MODELS } from "../ai-chat/chat-helpers";
import { parseCompanionCommand, summaryMessage, summaryPrompt, SUMMARY_SYSTEM } from "./companion-commands";
import { companionChat, companionHandlers, saveThread } from "./companion-chat-store";
import { buildCompanionSystemPrompt } from "./companion-prompt";
import { stalledOnIntent, userTurn, type CompanionContext } from "./companion-messages";
import { declineAllTrash } from "./trash-confirm";
import { useCompanionTools } from "./use-companion-tools";

// What each tool call's chip says once it ran (by toolCallId), for the session.
const atom_toolActivities = atom<Record<string, string>>({});

// The vault the thread was last held in; outlives the panel unmounting.
let threadVault: FileSystemDirectoryHandle | null = null;

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
  const [activities, setActivities] = useAtom(atom_toolActivities);

  useEffect(() => {
    companionHandlers.runToolCall = async ({ toolName, toolCallId, input }, turnId) => {
      const { output, activity } = await runTool({ toolName, input, toolCallId }, turnId);
      setActivities((prev) => ({ ...prev, [toolCallId]: activity }));
      return output;
    };
  }, [runTool, setActivities]);

  const { messages, sendMessage, status, stop, setMessages, error, clearError } = useChat({ chat: companionChat() });

  // A turn that stopped on "Let me…" gets one "continue" (per turn) instead
  // of leaving the user to type it.
  const nudgedAt = useRef<string | null>(null);
  useEffect(() => {
    if (status !== "ready" || !stalledOnIntent(messages)) return;
    const turnId = messages[messages.length - 1].id;
    if (nudgedAt.current === turnId) return;
    nudgedAt.current = turnId;
    void sendMessage({ text: "continue" });
  }, [status, messages, sendMessage]);

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

  // The running summary's request, so Stop and New chat cancel it.
  const compactAbort = useRef<AbortController | null>(null);

  // Stopping keeps any files a waiting trash call would move, and cancels a
  // summary being written (the thread stays as it was).
  const stopTurn = useCallback(() => {
    declineAllTrash(store);
    if (compactAbort.current) {
      compactAbort.current.abort();
      compactAbort.current = null;
      setCompacting(false);
    }
    void stop();
  }, [store, stop]);

  const newChat = useCallback(() => {
    stopTurn();
    setMessages([]);
    setActivities({});
    clearError();
    saveThread([]);
  }, [stopTurn, setMessages, setActivities, clearError, store]);

  // Another vault starts a fresh chat: the thread's paths, tool results and
  // open proposals belong to the vault it was held in. Closing a vault, or a
  // reload, keeps the thread; only opening a different one resets it.
  const vaultHandle = useAtomValue(atom_vaultHandle);
  useEffect(() => {
    if (!vaultHandle) return;
    const previous = threadVault;
    threadVault = vaultHandle;
    if (!previous || previous === vaultHandle) return;
    void (async () => {
      const same = await previous.isSameEntry?.(vaultHandle).catch(() => false);
      if (same || store.get(atom_vaultHandle) !== vaultHandle) return;
      newChat();
      store.set(atom_companionProposals, []);
    })();
  }, [vaultHandle, newChat, store]);

  // Replaces the thread with a summary of it. The thread stays as it is
  // while the summary is written (the thread shows that it is), if it fails
  // (the AI status says why) and if it's cancelled (Stop, New chat).
  const compact = useCallback(async (focus = "") => {
    const thread = companionChat().messages;
    if (!thread.length || compacting) return;
    stopTurn();
    clearError();
    setCompacting(true);
    const controller = new AbortController();
    compactAbort.current = controller;
    try {
      const summary = await callAI(SUMMARY_SYSTEM, summaryPrompt(thread, focus), controller.signal);
      if (controller.signal.aborted) return;
      const next = [summaryMessage(summary)];
      setMessages(next);
      setActivities({});
      saveThread(next);
    } catch {
      // callAI already shows the error in the AI status (none when
      // cancelled); the thread is kept.
    } finally {
      // A cancelled summary already stood down; a newer one may be running.
      if (compactAbort.current === controller) {
        compactAbort.current = null;
        setCompacting(false);
      }
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

  // The same prompt sent again right after its reply counts as a retry, and
  // Auto steps up a tier each time.
  const lastAuto = useRef<{ text: string; retries: number } | null>(null);

  // The model Auto picks for this message, or null when a model is picked.
  const autoChoice = useCallback((text: string, context: CompanionContext) => {
    if (store.get(atom_selectedAiModel) !== AUTO_MODEL_ID) {
      lastAuto.current = null;
      return null;
    }
    const retries = lastAuto.current?.text === text ? lastAuto.current.retries + 1 : 0;
    lastAuto.current = { text, retries };
    const provider = store.get(atom_aiProvider);
    const live = provider === "claude" ? store.get(atom_availableClaudeModels)
      : provider === "gemini" ? store.get(atom_availableGeminiModels)
      : store.get(atom_availableOllamaModels);
    const options = live.length ? live : provider === "claude" ? FALLBACK_CLAUDE_MODELS : provider === "gemini" ? FALLBACK_GEMINI_MODELS : [];
    const contextChars = context.selection.length + context.vaultRefs.reduce((n, ref) => n + ref.content.length, 0)
      + context.attachments.reduce((n, a) => n + (a.isImage ? 0 : a.data.length), 0);
    const tier = pickTier({ prompt: text, contextChars, hasAttachments: context.attachments.length > 0, retries, maxTier: "balanced" });
    const model = resolveAutoModel(provider, tier, options);
    if (process.env.NODE_ENV === "development") console.debug("[auto-model]", { tier, model, retries });
    return model ? { model, name: options.find((m) => m.id === model)?.name ?? model, tier } : null;
  }, [store]);

  const send = useCallback(async (text: string, context: CompanionContext) => {
    const command = parseCompanionCommand(text);
    if (command?.kind === "new") return newChat();
    if (command?.kind === "compact") return compact(command.focus);
    companionHandlers.system = buildCompanionSystemPrompt({
      hasVault: !!store.get(atom_vaultHandle),
      webSearch: isWebSearchEnabled() && store.get(atom_aiProvider) === "claude",
    });
    clearError();
    const auto = autoChoice(text, context);
    companionHandlers.modelOverride = auto?.model;
    await sendMessage(userTurn(text, context, auto ?? undefined));
  }, [store, sendMessage, clearError, newChat, compact, autoChoice]);

  const errorText = error ? beautifyAIError(error.message || "The AI request failed.") : null;

  return { messages, status, isBusy, compacting, errorText, activities, send, stop: stopTurn, newChat, compact, undoTurn };
}
