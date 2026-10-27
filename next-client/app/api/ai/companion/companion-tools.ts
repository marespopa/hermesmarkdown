import { anthropic } from '@ai-sdk/anthropic';
import type { ModelMessage, Tool } from 'ai';
import { COMPANION_TOOL_DEFS } from '@/app/services/companion-tool-defs';

// The companion's tools, declared without `execute`: the vault lives in the
// user's browser, so each call streams back to the client, which runs it and
// sends the result with the next request.
export const COMPANION_TOOLS: Record<string, Tool> = Object.fromEntries(
  Object.entries(COMPANION_TOOL_DEFS).map(([name, { description, inputSchema }]) => [name, { description, inputSchema }]),
);

// Searches the web may run in one turn.
export const WEB_SEARCH_MAX_USES = 5;

// Models that take web search with dynamic filtering (web_search_20260209):
// Opus 4.6 and later, Sonnet 4.6 and later. Older ones (Haiku 4.5, …) take
// the basic web_search_20250305.
const DYNAMIC_FILTERING = /^claude-(?:opus-(?:4-[6-9]|[5-9])|sonnet-(?:4-[6-9]|[5-9]))/;

// Claude's own web search, run by Anthropic during the turn (no `execute`
// here, nothing for the browser to run): results and sources stream back
// with the reply. It must also be allowed in the key's Anthropic Console.
export function webSearchTool(modelId: string): Tool {
  return DYNAMIC_FILTERING.test(modelId)
    ? anthropic.tools.webSearch_20260209({ maxUses: WEB_SEARCH_MAX_USES })
    : anthropic.tools.webSearch_20250305({ maxUses: WEB_SEARCH_MAX_USES });
}

// Gemini's content-safety filtering behaves more reliably with the system
// instructions folded into the first user message than as a separate system
// message (as the one-shot route does). The rest of the conversation,
// tool calls and results with their provider metadata, is left as it is.
export function foldSystem(system: string, messages: ModelMessage[]): ModelMessage[] {
  const index = messages.findIndex((message) => message.role === 'user');
  if (!system.trim() || index < 0) return messages;
  const first = messages[index];
  if (first.role !== 'user') return messages;
  const content = typeof first.content === 'string'
    ? `${system}\n\n${first.content}`
    : [{ type: 'text' as const, text: system }, ...first.content];
  return messages.map((message, i) => (i === index ? { ...first, content } : message));
}
