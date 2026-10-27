import type { Tool } from 'ai';
import { NOTE_TOOL_DEFS } from '@/app/services/note-tool-defs';

// AI Chat's tools. Declared here without `execute`: the vault lives in the
// user's browser, so the model's tool calls go back to the client, which runs
// them against the vault and sends the results in the next request
// (app/editor/components/ai-chat/use-chat-tools.ts). The definitions are
// shared with WebMCP (app/services/note-tool-defs.ts).
export const CHAT_TOOLS: Record<string, Tool> = Object.fromEntries(
  Object.entries(NOTE_TOOL_DEFS).map(([name, { description, inputSchema }]) => [name, { description, inputSchema }]),
);
