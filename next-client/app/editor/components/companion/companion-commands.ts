import type { TextUIPart } from "ai";
import { startsWithCommand } from "../ai-chat/chat-skills";
import { toolPartView, typedText, type CompanionMessage } from "./companion-messages";

// The companion's own commands, typed at the start of a message: /new (or
// /clear) starts a new chat; /compact (or /summarize, /summarise) replaces the
// thread with a summary; /plan makes a plan without changing files. Words after
// /compact say what the summary should keep. They win over skills of the same
// name (use-chat-skills.ts never lists them).
export const NEW_CHAT_COMMANDS = ["/new", "/clear"] as const;
export const COMPACT_COMMANDS = ["/compact", "/summarize", "/summarise"] as const;
export const PLAN_COMMAND = "/plan";
export const COMPANION_COMMANDS: readonly string[] = [...NEW_CHAT_COMMANDS, ...COMPACT_COMMANDS, PLAN_COMMAND];

// What the composer's / menu lists for the companion's own commands.
export const COMPANION_COMMAND_LIST: readonly { command: string; description: string }[] = [
  { command: "/new", description: "Start a new chat" },
  { command: "/clear", description: "Clear the chat" },
  { command: "/compact", description: "Summarize the chat and go on from it" },
  { command: "/summarize", description: "Summarize the chat and go on from it" },
  { command: "/summarise", description: "Summarize the chat and go on from it" },
  { command: "/plan", description: "Write an implementation plan without changing files" },
];

export type CompanionCommand = { kind: "new" } | { kind: "compact"; focus: string } | { kind: "plan"; request: string };

export function parseCompanionCommand(text: string): CompanionCommand | null {
  if (NEW_CHAT_COMMANDS.some((command) => startsWithCommand(text, command))) return { kind: "new" };
  const compact = COMPACT_COMMANDS.find((command) => startsWithCommand(text, command));
  if (compact) return { kind: "compact", focus: text.trimStart().slice(compact.length).trim() };
  if (startsWithCommand(text, PLAN_COMMAND)) return { kind: "plan", request: text.trimStart().slice(PLAN_COMMAND.length).trim() };
  return null;
}

// The longest transcript sent for a summary; older text is cut first.
const MAX_TRANSCRIPT_CHARS = 120_000;

// The thread as plain text for the summary: what the user typed, the
// replies' text and one line per tool call (never tool results or context
// blocks; the model can read files again). A summary already in the thread
// goes in whole.
export function transcriptText(messages: CompanionMessage[]): string {
  const lines = messages.map((message) => {
    if (message.metadata?.summary) return `EARLIER SUMMARY:\n${typedText(message)}`;
    if (message.role === "user") return `USER: ${typedText(message)}`;
    const parts = message.parts.flatMap((part) => {
      if (part.type === "text") return part.text.trim() ? [part.text.trim()] : [];
      const view = toolPartView(part);
      return view ? [`[${view.toolName} ${JSON.stringify(view.input).slice(0, 200)}]`] : [];
    });
    return `ASSISTANT: ${parts.join("\n")}`;
  });
  const text = lines.join("\n\n");
  return text.length > MAX_TRANSCRIPT_CHARS ? text.slice(-MAX_TRANSCRIPT_CHARS) : text;
}

export const SUMMARY_SYSTEM = [
  "You summarize a conversation between a user and the AI companion of a Markdown notes app, so the conversation can go on from the summary alone.",
  "Keep: what the user wants and asked for, decisions made, files and folders read, created or changed (by path), open questions and the next step.",
  "Leave out pleasantries and anything already done that won't matter again.",
  "Write it as short Markdown bullets, in the user's language. Answer with the summary only.",
].join("\n");

export function summaryPrompt(messages: CompanionMessage[], focus: string): string {
  const keep = focus ? `\n\nThe user asked the summary to keep: ${focus}` : "";
  return `--- CONVERSATION ---\n${transcriptText(messages)}\n--- END CONVERSATION ---${keep}`;
}

// The message a compacted thread starts with: the summary as a user turn,
// so it reaches the model with the next message; the thread shows it as the
// summary, not as something the user typed.
export function summaryMessage(summary: string): CompanionMessage {
  const part: TextUIPart = { type: "text", text: summary.trim() };
  return {
    id: `summary-${Date.now()}`,
    role: "user",
    parts: [part, { type: "text", text: "(This is a summary of our earlier conversation, which was cleared to save space. Go on from it.)" }],
    metadata: { summary: true },
  };
}
