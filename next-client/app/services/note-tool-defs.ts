import { z } from 'zod';

// The read-only note tools: their descriptions and input schemas, shared by
// the AI companion (app/services/companion-tool-defs.ts, sent to the model). It runs them
// in the browser through useNoteTools (app/editor/components/ai-chat/use-note-tools.ts).
// Names must match CHAT_TOOL_NAMES in chat-tool-runners.ts.
export const NOTE_TOOL_DEFS = {
  search_notes: {
    title: 'Search notes',
    description:
      "Search the user's notes by words in their text, name, title, aliases, tags or description. Returns matching notes with the matching line and each note's description. Use it to find notes before reading them.",
    inputSchema: z.object({
      query: z.string().min(1).describe('Words to look for'),
      limit: z.number().int().min(1).max(20).optional().describe('Most results to return (default 8)'),
    }),
  },
  read_note: {
    title: 'Read note',
    description: "Read one of the user's notes in full, by its name (as in a [[wiki link]], without .md).",
    inputSchema: z.object({
      name: z.string().min(1).describe('The note name, e.g. "Roadmap" or "2026-10-12"'),
    }),
  },
  list_open_tasks: {
    title: 'List open tasks',
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
