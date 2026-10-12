"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAtomValue, useStore } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_templatesFolder } from "@/app/atoms/template-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { useNoteBuffer } from "@/app/hooks/file-system/use-note-buffer";
import { resolveFileMetaByName } from "@/app/hooks/file-system/resolve-file-by-name";
import { callAIChatTurn, type AIToolCall, type ApiMessage, type ToolExchangeMessage } from "@/app/services/ai";
import { searchNoteContent } from "@/app/services/content-search-client";
import { isTemplatePath } from "@/app/utils/templates/template-registry";
import { useQuickJot } from "../../hooks/use-quick-jot";
import {
  DEFAULT_SEARCH_LIMIT,
  readNoteOutput,
  searchablePaths,
  searchNotesOutput,
  taskFilter,
  toolActivity,
  type TaskView,
} from "./chat-tool-runners";
import { openTasksBlock } from "./skill-context";

// A turn makes at most this many rounds of tool calls before it stops.
export const MAX_TOOL_ROUNDS = 6;

export interface ToolApproval {
  lines: string[];
  approve: () => void;
  decline: () => void;
}

const STOPPED = "I stopped after several lookups without an answer. Try asking more specifically.";

// AI Chat's tools, run in the browser against the open vault: search_notes
// (content index, plus names and tags), read_note, list_open_tasks, and
// add_to_today, which waits for the user's Add / Don't add (`approval`)
// before Quick jot appends the lines. `converse` runs one user turn: ask,
// run the tools the model calls, send their results, until it answers.
// Each tool run is reported through `onActivity`, for the thread.
export function useChatTools() {
  const store = useStore();
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const { readCurrentText } = useNoteBuffer();
  const { addJot } = useQuickJot();
  const [approval, setApproval] = useState<ToolApproval | null>(null);
  const pending = useRef<((ok: boolean) => void) | null>(null);

  const askApproval = useCallback((lines: string[]) => new Promise<boolean>((resolve) => {
    const settle = (ok: boolean) => {
      pending.current = null;
      setApproval(null);
      resolve(ok);
    };
    pending.current = settle;
    setApproval({ lines, approve: () => settle(true), decline: () => settle(false) });
  }), []);

  // Closing the chat declines a pending approval, so a turn never hangs.
  const cancelApproval = useCallback(() => pending.current?.(false), []);
  useEffect(() => cancelApproval, [cancelApproval]);

  const skip = useCallback((path: string) => {
    const folder = store.get(atom_templatesFolder).folder;
    return path.startsWith(".hermes/") || isTemplatePath(path, folder);
  }, [store]);

  const runTool = useCallback(async ({ toolName, input: rawInput }: AIToolCall): Promise<{ output: string; activity: string }> => {
    const input = (rawInput ?? {}) as Record<string, unknown>;
    const meta = store.get(atom_fileMetadata);
    if (toolName === "search_notes") {
      const query = String(input.query ?? "").trim();
      const limit = Math.min(20, Math.max(1, Number(input.limit) || DEFAULT_SEARCH_LIMIT));
      const paths = searchablePaths(meta, skip);
      const result = query ? await searchNoteContent(query, paths, limit) : null;
      const output = searchNotesOutput(query, meta, paths, result?.hits ?? null, limit);
      const found = output.match(/^(\d+) notes? match/)?.[1] ?? "0";
      return { output, activity: toolActivity(toolName, input, `${found} found`) };
    }
    if (toolName === "read_note") {
      const name = String(input.name ?? "");
      const file = resolveFileMetaByName(name, meta);
      const usable = file && !skip(file.path) ? file : null;
      let text: string | null = null;
      if (usable) {
        try {
          text = await readCurrentText(usable.path);
        } catch (err) {
          console.warn("AI Chat: couldn't read", usable.path, err);
        }
      }
      return { output: readNoteOutput(name, usable, text), activity: toolActivity(toolName, input) };
    }
    if (toolName === "list_open_tasks") {
      const filter = taskFilter({ view: input.view as TaskView | undefined, tag: input.tag as string | undefined, query: input.query as string | undefined });
      return { output: openTasksBlock(meta, new Date(), skip, filter), activity: toolActivity(toolName, input) };
    }
    if (toolName === "add_to_today") {
      const lines = (Array.isArray(input.lines) ? input.lines : []).map(String).map((line) => line.trim()).filter(Boolean);
      if (!lines.length) return { output: "No lines to add.", activity: toolActivity(toolName, input, "nothing to add") };
      if (!(await askApproval(lines))) {
        return { output: "The user declined; nothing was added. Don't ask again unless they do.", activity: toolActivity(toolName, input, "not added") };
      }
      let added = 0;
      let sheet = "";
      for (const line of lines) {
        const outcome = await addJot(line);
        if (outcome.result !== "added") break;
        added++;
        sheet = outcome.sheetName;
      }
      const output = added === lines.length
        ? `Added ${added} line${added === 1 ? "" : "s"} to [[${sheet}]].`
        : `Added ${added} of ${lines.length} lines; the rest couldn't be written.`;
      return { output, activity: toolActivity(toolName, input, `${added} line${added === 1 ? "" : "s"} added`) };
    }
    return { output: `Unknown tool ${toolName}.`, activity: toolActivity(toolName, input) };
  }, [store, skip, readCurrentText, addJot, askApproval]);

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

  return { available: !!vaultHandle, converse, approval, cancelApproval };
}
