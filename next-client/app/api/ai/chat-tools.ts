import type { Tool } from 'ai';
import { z } from 'zod';

// AI Chat's tools. Declared here without `execute`: the vault lives in the
// user's browser, so the model's tool calls go back to the client, which runs
// them against the vault and sends the results in the next request
// (app/editor/components/ai-chat/use-chat-tools.ts). Names must match
// CHAT_TOOL_NAMES there.
export const CHAT_TOOLS: Record<string, Tool> = {
  search_notes: {
    description:
      "Search the user's notes by words in their text, name, title, aliases, tags or description. Returns matching notes with the matching line and each note's description. Use it to find notes before reading them.",
    inputSchema: z.object({
      query: z.string().min(1).describe('Words to look for'),
      limit: z.number().int().min(1).max(20).optional().describe('Most results to return (default 8)'),
    }),
  },
  read_note: {
    description: "Read one of the user's notes in full, by its name (as in a [[wiki link]], without .md).",
    inputSchema: z.object({
      name: z.string().min(1).describe('The note name, e.g. "Roadmap" or "2026-10-12"'),
    }),
  },
  list_open_tasks: {
    description:
      "List the user's open tasks (to do, in progress, on hold) across the vault, most pressing first, with due dates, priorities, tags and their note.",
    inputSchema: z.object({
      view: z
        .enum(['all', 'in_progress', 'due_today', 'overdue', 'upcoming'])
        .optional()
        .describe('all (default), in_progress, due_today, overdue, or upcoming (due after today)'),
      tag: z.string().optional().describe('Only tasks with this tag, without #'),
      query: z.string().optional().describe('Only tasks whose text contains this'),
    }),
  },
};
