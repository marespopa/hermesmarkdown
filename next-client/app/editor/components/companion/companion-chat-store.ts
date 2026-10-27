import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { getAIConfig, isWebSearchEnabled } from "@/app/services/ai";
import { forModel, shouldContinue, WEB_TOOL_NAMES, type CompanionMessage } from "./companion-messages";

// The companion's one conversation, outside React: the Chat instance lives
// for the whole session, so the thread survives the panel closing,
// remounting or moving between pages, and it is saved in this browser
// (localStorage), so it survives a reload. The hook (use-companion-chat.ts)
// fills `companionHandlers` with what the instance calls back into: the
// turn's system prompt and the tool runner.

const STORAGE_KEY = "companionThread";
// The newest messages kept across reloads, within this much JSON.
const MAX_SAVED_MESSAGES = 80;
const MAX_SAVED_CHARS = 1_500_000;

export interface CompanionHandlers {
  system: string;
  runToolCall: (call: { toolName: string; toolCallId: string; input: unknown }, turnId: string) => Promise<string>;
}

export const companionHandlers: CompanionHandlers = {
  system: "",
  runToolCall: async () => "The tools aren't ready yet. Try again.",
};

export function loadThread(): CompanionMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Saves the thread, newest first within the limits. Attached images are
// dropped from what's saved (their data is large); their names stay.
export function saveThread(messages: CompanionMessage[]): void {
  try {
    if (!messages.length) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const slim = messages.slice(-MAX_SAVED_MESSAGES).map((message) => ({
      ...message,
      parts: message.parts.filter((part) => part.type !== "file"),
    }));
    let json = JSON.stringify(slim);
    while (json.length > MAX_SAVED_CHARS && slim.length > 1) {
      slim.shift();
      json = JSON.stringify(slim);
    }
    localStorage.setItem(STORAGE_KEY, json);
  } catch {
    // Storage full or blocked: the thread still lives for this session.
  }
}

// The id of the user message that started the current turn.
const currentTurnId = (messages: CompanionMessage[]) =>
  [...messages].reverse().find((message) => message.role === "user")?.id ?? "turn";

// useChat shows a failed reply's body as the error. When that body is a web
// page (the host's timeout or gateway page, not the route's own text), it
// becomes one line naming the page and its status instead.
export function withReadableErrors(fetchImpl?: typeof globalThis.fetch): typeof globalThis.fetch {
  return async (input, init) => {
    const response = await (fetchImpl ?? globalThis.fetch)(input, init);
    if (response.ok) return response;
    const text = await response.text();
    if (!/^\s*<(!doctype|html)/i.test(text)) return new Response(text, { status: response.status });
    const title = text.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() || "error page";
    const timedOut = response.status === 504 || /timeout/i.test(title);
    const message = timedOut
      ? `The server stopped waiting for the AI's answer (${title}, ${response.status}). Send the message again, or ask for a smaller step.`
      : `The AI request failed (${title}, ${response.status}). Try again.`;
    return new Response(message, { status: response.status });
  };
}

let chat: Chat<CompanionMessage> | null = null;

// A Chat wired to the companion's route and tools; `fetch` stands in for the
// network in tests.
export function createCompanionChat({ messages = [], fetch }: { messages?: CompanionMessage[]; fetch?: typeof globalThis.fetch } = {}): Chat<CompanionMessage> {
  const instance: Chat<CompanionMessage> = new Chat<CompanionMessage>({
    messages,
    transport: new DefaultChatTransport<CompanionMessage>({
      api: "/api/ai/companion",
      fetch: withReadableErrors(fetch),
      // Read fresh for each request: the key, provider and model never leave
      // the browser except to this route.
      body: () => ({ ...getAIConfig(), system: companionHandlers.system, webSearch: isWebSearchEnabled() }),
      // Older turns go trimmed (forModel); the thread itself keeps them whole.
      prepareSendMessagesRequest: ({ id, messages, body, trigger, messageId }) => ({
        body: { ...body, id, messages: forModel(messages), trigger, messageId },
      }),
    }),
    sendAutomaticallyWhen: shouldContinue,
    onToolCall: async ({ toolCall }) => {
      // Web search runs at the provider; its result is already in the stream.
      if (WEB_TOOL_NAMES.has(toolCall.toolName)) return;
      const output = await companionHandlers.runToolCall(toolCall, currentTurnId(instance.messages));
      // Not awaited: awaiting it inside onToolCall can deadlock the loop.
      void instance.addToolOutput({ tool: toolCall.toolName, toolCallId: toolCall.toolCallId, output });
    },
  });
  return instance;
}

export function companionChat(): Chat<CompanionMessage> {
  chat ??= createCompanionChat({ messages: typeof window === "undefined" ? [] : loadThread() });
  return chat;
}
