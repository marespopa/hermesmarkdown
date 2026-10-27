"use client";

import { useCallback } from "react";
import { useAtomValue } from "jotai";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { callAIChatTurn, type ApiMessage, type ToolExchangeMessage } from "@/app/services/ai";
import { useNoteTools } from "./use-note-tools";

// A turn makes at most this many rounds of tool calls before it stops.
export const MAX_TOOL_ROUNDS = 6;

const STOPPED = "I stopped after several lookups without an answer. Try asking more specifically.";

// AI Chat's tool loop over the read-only note tools (use-note-tools.ts).
// `converse` runs one user turn: ask, run the tools the model calls, send
// their results, until it answers. Each tool run is reported through
// `onActivity`, for the thread.
export function useChatTools() {
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const { runTool } = useNoteTools();

  const converse = useCallback(async (
    system: string,
    messages: ApiMessage[],
    onActivity: (line: string) => void,
  ): Promise<string> => {
    let conversation: (ApiMessage | ToolExchangeMessage)[] = messages;
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const turn = await callAIChatTurn(system, conversation);
      if (!turn.toolCalls?.length) return turn.text;
      const results: { type: "tool-result"; toolCallId: string; toolName: string; output: { type: "text"; value: string } }[] = [];
      for (const call of turn.toolCalls) {
        const { output, activity } = await runTool(call);
        onActivity(activity);
        results.push({ type: "tool-result", toolCallId: call.toolCallId, toolName: call.toolName, output: { type: "text", value: output } });
      }
      conversation = [...conversation, ...(turn.responseMessages ?? []), { role: "tool", content: results }];
    }
    return STOPPED;
  }, [runTool]);

  return { available: !!vaultHandle, converse };
}
