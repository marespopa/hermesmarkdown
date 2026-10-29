import type { FileUIPart, TextUIPart, UIMessage } from "ai";
import type { Tier } from "../ai-chat/auto-model";
import type { Attachment, VaultRef } from "../ai-chat/chat-helpers";
import type { CompanionToolName } from "@/app/services/companion-tool-defs";
import type { ProjectCheckId } from "@/app/services/project-checks";
import { parsePlanSteps, type PlanStep } from "./tools/search-tools";

// The companion thread's messages: what a user turn sends (their words, then
// the context chips as a second text part, then images), what of the thread
// is sent to the model, how the tool loop is capped, and how a message's
// parts read back for display.

// A turn makes at most this many rounds of tool calls before it stops. A long
// plan gets there because the turn's own old results are left out of the
// request (trimLongTurn), so its size stays flat.
export const MAX_TOOL_ROUNDS = 200;

// Shown under a sent message: the labels of the context it carried.
// `summary` marks the message a compacted thread starts with
// (companion-commands.ts).
export interface CompanionMetadata {
  context?: string[];
  // On a user turn sent with Auto: the model chosen for its reply.
  auto?: { model: string; name: string; tier: Tier };
  summary?: boolean;
  activeSkillPolicy?: { tools?: CompanionToolName[]; checks?: ProjectCheckId[] };
}
export type CompanionMessage = UIMessage<CompanionMetadata>;

// The context chips of the next message: the note it was opened from, the
// selection, @mentions and attachments.
export interface CompanionContext {
  path: string | null;
  selection: string;
  vaultRefs: VaultRef[];
  attachments: Attachment[];
}

// The skill a message's /command named, sent in its context.
export interface TurnSkill {
  command: string;
  text: string;
  toolBindings?: CompanionToolName[];
  projectChecks?: ProjectCheckId[];
}

// The parts and metadata of a user turn, for useChat's sendMessage.
export function userTurn(text: string, { path, selection, vaultRefs, attachments }: CompanionContext, skill?: TurnSkill, auto?: CompanionMetadata["auto"]) {
  const blocks: string[] = [];
  const labels: string[] = [];
  if (skill) {
    blocks.push(`--- SKILL ${skill.command} ---\n${skill.text}\n--- END SKILL ---`);
    labels.push(skill.command);
  }
  if (path) {
    blocks.push(`The user is in ${path}.`);
    labels.push(path.split("/").pop() ?? path);
  }
  if (selection.trim()) {
    blocks.push(`--- SELECTED TEXT (in ${path ?? "the editor"}) ---\n${selection}\n--- END SELECTED TEXT ---`);
    labels.push("Selection");
  }
  for (const ref of vaultRefs) {
    blocks.push(`--- ${ref.label} ---\n${ref.content}\n--- End ${ref.label} ---`);
    labels.push(ref.label);
  }
  const files: FileUIPart[] = [];
  for (const attachment of attachments) {
    labels.push(attachment.name);
    if (attachment.isImage) {
      files.push({ type: "file", mediaType: attachment.mimeType, url: attachment.data, filename: attachment.name });
    } else {
      blocks.push(`--- File: ${attachment.name} ---\n${attachment.data}\n--- End: ${attachment.name} ---`);
    }
  }
  const parts: (TextUIPart | FileUIPart)[] = [{ type: "text", text: text || "(see the attached context)" }];
  if (blocks.length) parts.push({ type: "text", text: `--- CONTEXT ---\n${blocks.join("\n\n")}\n--- END CONTEXT ---` });
  parts.push(...files);
  const metadata: CompanionMetadata = {
    ...(labels.length ? { context: labels } : {}), ...(auto ? { auto } : {}),
    ...(skill && (skill.toolBindings || skill.projectChecks) ? { activeSkillPolicy: { tools: skill.toolBindings, checks: skill.projectChecks } } : {}),
  };
  return { parts, metadata: Object.keys(metadata).length ? metadata : undefined };
}

// The newest turns sent to the model in full. In older ones, long tool
// results and context blocks are left out and images dropped; the model can
// read a file again. Only the request is trimmed, never the saved thread,
// and a turn's rounds all send the same history, so the provider's cache
// holds for the turn.
export const FULL_TURNS = 6;
const LONG_PART_CHARS = 2_000;
export const LEFT_OUT = "(Left out of this earlier turn to save space; read it again if you need it.)";

// A tool part with its long result, and the long text a write sent, left out.
// update_plan's answer is the model's place in the plan: always kept.
function trimToolPart<P extends { type: string }>(part: P): P {
  const tool = part as unknown as { type: string; state?: string; input?: Record<string, unknown>; output?: unknown };
  if (!isToolPart(part)) return part;
  let next = tool;
  if (tool.state === "output-available" && typeof tool.output === "string" && tool.output.length > LONG_PART_CHARS && tool.type !== "tool-update_plan") {
    next = { ...next, output: LEFT_OUT };
  }
  const content = tool.input?.content;
  if (typeof content === "string" && content.length > LONG_PART_CHARS) next = { ...next, input: { ...tool.input, content: LEFT_OUT } };
  return next === tool ? part : (next as unknown as P);
}

function trimOld<M extends UIMessage>(message: M): M {
  let typedSeen = false;
  const parts = message.parts.flatMap((part): M["parts"] => {
    if (message.role === "user" && part.type === "file") return [];
    if (message.role === "user" && part.type === "text") {
      const keep = !typedSeen || part.text.length <= LONG_PART_CHARS;
      typedSeen = true;
      return [keep ? part : { ...part, text: LEFT_OUT }];
    }
    return [trimToolPart(part)];
  });
  return { ...message, parts } as M;
}

// Inside the turn running now, the newest KEEP_ROUNDS rounds are sent whole
// and the older ones trimmed. The cut moves a TRIM_BLOCK of rounds at a time,
// so the request's start stays the same between jumps and the provider's
// cache keeps holding.
export const KEEP_ROUNDS = 10;
export const TRIM_BLOCK = 10;

function trimLongTurn<M extends UIMessage>(message: M): M {
  if (message.role !== "assistant") return message;
  const starts = message.parts.flatMap((part, index) => (part.type === "step-start" ? [index] : []));
  const cutStep = Math.floor(Math.max(0, starts.length - KEEP_ROUNDS) / TRIM_BLOCK) * TRIM_BLOCK;
  if (cutStep <= 0) return message;
  const cut = starts[cutStep];
  const parts = message.parts.map((part, index) => (index < cut ? trimToolPart(part) : part));
  return parts.some((part, index) => part !== message.parts[index]) ? ({ ...message, parts } as M) : message;
}

// The thread as the next request sends it: the last FULL_TURNS user turns
// and their replies as they are, older turns trimmed, and the old rounds of
// a long turn in progress.
export function forModel<M extends UIMessage>(messages: M[]): M[] {
  const starts = messages.flatMap((message, index) => (message.role === "user" ? [index] : []));
  const cutoff = starts.length > FULL_TURNS ? starts[starts.length - FULL_TURNS] : 0;
  const last = messages.length - 1;
  const result = messages.map((message, index) => {
    const base = index < cutoff ? trimOld(message) : message;
    return index === last ? trimLongTurn(base) : base;
  });
  return result.some((message, index) => message !== messages[index]) ? result : messages;
}

// Rounds of tool calls in the reply so far (each round starts a step).
export function toolRounds(messages: UIMessage[]): number {
  const last = messages[messages.length - 1];
  if (last?.role !== "assistant") return 0;
  return last.parts.filter((part) => part.type === "step-start").length;
}

// Tools the provider runs itself (Claude's web search): their calls and
// results arrive in the stream, in the same step as the answer, so the
// browser never runs them and they never call for another round.
export const WEB_TOOL_NAMES = new Set(["web_search"]);

type ToolPartLike = { type: string; toolName?: string; state?: string; providerExecuted?: boolean };

const isToolPart = (part: { type: string }) => part.type.startsWith("tool-") || part.type === "dynamic-tool";
const toolNameOf = (part: ToolPartLike) => (part.type === "dynamic-tool" ? part.toolName ?? "" : part.type.slice("tool-".length));

// The last step's calls for the browser to run: every tool call after the
// reply's last step-start, less those the provider ran.
function lastStepBrowserCalls(messages: UIMessage[]): ToolPartLike[] | null {
  const last = messages[messages.length - 1];
  if (last?.role !== "assistant") return null;
  const start = last.parts.map((part) => part.type).lastIndexOf("step-start");
  return (last.parts.slice(start + 1) as ToolPartLike[])
    .filter((part) => isToolPart(part) && !part.providerExecuted && !WEB_TOOL_NAMES.has(toolNameOf(part)));
}

// The reply's last step called browser tools and every one has its result.
function lastStepAnswered(messages: UIMessage[]): boolean {
  const calls = lastStepBrowserCalls(messages);
  return !!calls?.length && calls.every((part) => part.state === "output-available" || part.state === "output-error");
}

// useChat's sendAutomaticallyWhen: answer the model once its browser tool
// calls all have results, until the round cap. A step that only used the
// provider's own tools (web search) and answered ends the turn.
export function shouldContinue({ messages }: { messages: UIMessage[] }): boolean {
  return lastStepAnswered(messages) && toolRounds(messages) < MAX_TOOL_ROUNDS;
}

// A reply that ends on a line announcing the next step ("Let me check the
// code.") instead of taking it: after tool calls, its last step is text only
// and its last sentence says what it is about to do. Some models stop there;
// the chat hook sends one "continue" so the user doesn't have to.
const INTENT = /^(let me|let's|i'll|i will|i'm going to|i am going to|now,? i|next,? i|now let me|first,? i)\b/i;
export function stalledOnIntent(messages: UIMessage[]): boolean {
  const last = messages[messages.length - 1];
  if (last?.role !== "assistant" || toolRounds(messages) < 1) return false;
  const start = last.parts.map((part) => part.type).lastIndexOf("step-start");
  const step = last.parts.slice(start + 1);
  if (step.some(isToolPart)) return false;
  const text = step.filter((part): part is TextUIPart => part.type === "text").map((part) => part.text).join("").trim();
  if (!text || text.endsWith("?")) return false;
  const sentence = text.split(/(?<=[.!:…])\s+|\n+/).filter(Boolean).pop() ?? "";
  return /[:…]$|\.\.\.$/.test(text) || INTENT.test(sentence.trim());
}

// The turn stopped at the cap: the reply ends with answered tool calls.
export function stoppedAtCap(messages: UIMessage[]): boolean {
  return lastStepAnswered(messages) && toolRounds(messages) >= MAX_TOOL_ROUNDS;
}

// The words a user typed (the first text part; the rest is context).
export function typedText(message: UIMessage): string {
  const first = message.parts.find((part): part is TextUIPart => part.type === "text");
  return first?.text ?? "";
}

export interface ToolPartView {
  toolCallId: string;
  toolName: string;
  state: "running" | "done" | "failed";
  input: Record<string, unknown>;
}

export type PartItem =
  | { part: UIMessage["parts"][number]; index: number }
  | { plan: PlanStep[] }
  | { tool: ToolPartView };

// A reply's parts as the thread shows them: text, the plan (one checklist, at
// the first update_plan call, with the latest steps) and calls still waiting
// or running (a trash call asks the user). Finished and failed calls are
// debugging detail: they come back in `hidden`, shown on request.
export function replyItems(parts: UIMessage["parts"]): { items: PartItem[]; hidden: ToolPartView[] } {
  const items: PartItem[] = [];
  const hidden: ToolPartView[] = [];
  let plan: PlanStep[] | null = null;
  let planAt = -1;
  parts.forEach((part, index) => {
    const view = toolPartView(part);
    if (!view) {
      items.push({ part, index });
    } else if (view.toolName === "update_plan") {
      const steps = parsePlanSteps(view.input.steps);
      if (steps.length) plan = steps;
      if (planAt < 0) {
        planAt = items.length;
        items.push({ plan: [] });
      }
    } else if (view.state === "running") {
      items.push({ tool: view });
    } else {
      hidden.push(view);
    }
  });
  if (planAt >= 0) items[planAt] = plan ? { plan } : { plan: [] };
  return { items: items.filter((item) => !("plan" in item) || item.plan.length), hidden };
}

// A tool part of an assistant message, for its chip; null for other parts.
export function toolPartView(part: UIMessage["parts"][number]): ToolPartView | null {
  const isStatic = part.type.startsWith("tool-");
  if (!isStatic && part.type !== "dynamic-tool") return null;
  const tool = part as { type: string; toolName?: string; toolCallId: string; state: string; input?: unknown };
  const toolName = isStatic ? tool.type.slice("tool-".length) : tool.toolName ?? "tool";
  const state = tool.state === "output-available" ? "done" : tool.state === "output-error" || tool.state === "output-denied" ? "failed" : "running";
  return { toolCallId: tool.toolCallId, toolName, state, input: (tool.input ?? {}) as Record<string, unknown> };
}
