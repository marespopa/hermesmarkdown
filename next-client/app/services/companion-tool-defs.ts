import { z } from 'zod';
import { NOTE_TOOL_DEFS } from './note-tool-defs';

// The AI companion's tools: the note tools (search_notes, read_note,
// list_open_tasks), the vault and editor read tools, load_skill, the edits,
// the organising tools and create_template. Sent to the model
// without `execute` (app/api/ai/companion/companion-tools.ts) and run in the
// browser (app/editor/components/companion/use-companion-tools.ts).
export const COMPANION_TOOL_DEFS = {
  ...NOTE_TOOL_DEFS,
  list_folder: {
    title: 'List folder',
    description:
      "List what one folder of the user's vault holds: its folders, then its files (notes and code or text files), one page at a time. Use \"\" for the vault's top level.",
    inputSchema: z.object({
      path: z.string().describe('Vault-relative folder path, e.g. "Projects" or "" for the top level'),
      page: z.number().int().min(1).optional().describe('Page to show (default 1)'),
    }),
  },
  read_file: {
    title: 'Read file',
    description:
      "Read one file of the user's vault in full by its vault-relative path: a note (.md) or a code or text file. Use list_folder or search_notes to find paths; never guess them.",
    inputSchema: z.object({
      path: z.string().min(1).describe('Vault-relative path, e.g. "Projects/Roadmap.md" or "scripts/build.py"'),
    }),
  },
  get_active_note: {
    title: 'Get active note',
    description:
      'What the user has open in the editor: its path, the text they selected, and the fenced code block the cursor is in (when it is in one). Read the whole file with read_file.',
    inputSchema: z.object({}),
  },
  load_skill: {
    title: 'Load skill',
    description:
      "Load one of the skills listed in your instructions: its full instructions, and for the tasks skill the user's open tasks. Load a skill before starting work that fits it; a message starting with the skill's command already carries it.",
    inputSchema: z.object({
      name: z.string().min(1).describe('The skill\'s command, e.g. "/tasks" or "/standup-notes"'),
    }),
  },
  edit_file: {
    title: 'Edit file',
    description:
      "Change a note or code file in place: each edit replaces one exact piece of its current text. Read the file first and quote `find` exactly, with enough around it to match only once. The change is saved at once and shows in the editor; the user can undo the whole turn.",
    inputSchema: z.object({
      path: z.string().min(1).describe('Vault-relative path of the file to change'),
      edits: z.array(z.object({
        find: z.string().min(1).describe('Exact text now in the file; must match exactly once'),
        replace: z.string().describe('The text to put in its place ("" deletes it)'),
      })).min(1).describe('Applied in order'),
    }),
  },
  edit_code_block: {
    title: 'Edit code block',
    description:
      "Replace the code inside one fenced code block of a note (the fences stay). Pick the block by its index (0 is the note's first; get_active_note gives the one at the cursor) or by its language and first line.",
    inputSchema: z.object({
      path: z.string().min(1).describe('Vault-relative path of the note'),
      index: z.number().int().min(0).optional().describe("The block's index in the note"),
      lang: z.string().optional().describe("The block's language, e.g. python"),
      firstLine: z.string().optional().describe("The block's current first line of code"),
      code: z.string().describe('The new code for the block'),
    }),
  },
  create_file: {
    title: 'Create file',
    description:
      "Create a new note (.md) or code file at a vault-relative path, with its folders. Never overwrites: if the path is taken, it says so. The user can undo the whole turn.",
    inputSchema: z.object({
      path: z.string().min(1).describe('Vault-relative path, e.g. "Projects/Launch plan.md"'),
      content: z.string().describe("The file's text"),
    }),
  },
  create_folder: {
    title: 'Create folder',
    description:
      "Create a folder (and the folders above it) at a vault-relative path. The user can undo the whole turn.",
    inputSchema: z.object({
      path: z.string().min(1).describe('Vault-relative folder path, e.g. "Projects/Archive"'),
    }),
  },
  rename: {
    title: 'Rename',
    description:
      "Rename a note, file or folder where it is. Links to it in other notes follow the new name. A file keeps its extension when the new name has none. Use move to put it in another folder.",
    inputSchema: z.object({
      path: z.string().min(1).describe('Vault-relative path of the item'),
      newName: z.string().min(1).describe('The new name only, without folders, e.g. "Launch plan"'),
    }),
  },
  move: {
    title: 'Move',
    description:
      "Move notes, files or folders into an existing folder (create it first with create_folder). Links to them follow. The user can undo the whole turn.",
    inputSchema: z.object({
      paths: z.array(z.string().min(1)).min(1).describe('Vault-relative paths of the items to move'),
      folder: z.string().describe('Vault-relative path of the folder to move them into ("" for the top level)'),
    }),
  },
  trash: {
    title: 'Move to Trash',
    description:
      "Move notes, files or folders to the vault's Trash (kept 30 days). The user is asked first and may keep them; when they do, don't ask again unless they say so.",
    inputSchema: z.object({
      paths: z.array(z.string().min(1)).min(1).describe('Vault-relative paths of the items to move to the Trash'),
    }),
  },
  create_template: {
    title: 'Create template',
    description:
      "Save a new note template in the vault's templates folder, where the template picker finds it. The body is checked first: if it has problems, nothing is saved and they come back to fix. Never replaces a template; change one with edit_file.",
    inputSchema: z.object({
      name: z.string().min(1).describe('Short template name, e.g. "Meeting notes" (no folders)'),
      body: z.string().min(1).describe("The template's text, with its fields, e.g. {{title}}, {{date}}, {{prompt:Owner}}, {{cursor}}"),
    }),
  },
};

export type CompanionToolName = keyof typeof COMPANION_TOOL_DEFS;
export const COMPANION_TOOL_NAMES = Object.keys(COMPANION_TOOL_DEFS) as CompanionToolName[];

// The tools that change the vault (everything but the reads), for WebMCP's
// write switch (hooks/use-webmcp-tools.ts). trash isn't offered there: it
// asks on a card in the companion's thread.
export const COMPANION_WRITE_TOOL_NAMES: CompanionToolName[] = [
  'edit_file', 'edit_code_block', 'create_file', 'create_folder', 'rename', 'move', 'create_template',
];
