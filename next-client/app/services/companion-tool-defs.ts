import { z } from 'zod';
import { NOTE_TOOL_DEFS } from "./note-tool-defs";
import { TEMPLATE_SYNTAX_GUIDE } from "@/app/utils/templates/template-lint";

const PROPOSAL_DETAILS = {
  summary: z.string().max(240).optional().describe("Concise user-facing summary of the proposal; never include private reasoning"),
  explanation: z.string().max(400).optional().describe("Concise user-facing rationale for the change; never provide chain-of-thought"),
  impact: z.enum(["low", "medium", "high"]).optional().describe("User-facing impact level for review: low, medium, or high"),
};

// The AI companion's tools: the note tools (search_notes, read_note,
// list_open_tasks), the vault and editor read tools (list_folder, read_file,
// search_files, find_files), the edits (each a proposal), the
// organising tools and create_template. Sent to the model
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
      startLine: z.number().int().min(1).optional().describe('First line to read (default 1); a long file ends with the startLine to ask for next'),
      lineCount: z.number().int().min(1).max(2000).optional().describe('How many lines to read (default: as many as fit)'),
    }),
  },
  search_files: {
    title: 'Search files',
    description:
      "Find text inside the vault's files, code and text files as well as notes: each match comes back with its path, line number and line. Use it to locate a function, a name or a setting before reading or editing. Searches the exact text (any case) or, with regex, a JavaScript regular expression. Limit it to a folder with `folder`.",
    inputSchema: z.object({
      query: z.string().min(1).describe('Text to look for, or a regular expression when regex is true'),
      regex: z.boolean().optional().describe('Treat query as a JavaScript regular expression (default false)'),
      folder: z.string().optional().describe('Only search this vault-relative folder, e.g. "src"'),
      limit: z.number().int().min(1).max(100).optional().describe('Most matches to return (default 30)'),
    }),
  },
  find_files: {
    title: 'Find files',
    description:
      "Find files in the vault by name, anywhere in its folders. The pattern is a glob: * matches within a folder name, ** across folders, ? one character; a pattern without a / is matched against file names only. Examples: \"*.test.ts\", \"src/**/*.tsx\", \"config*\". Use search_files to find text inside files.",
    inputSchema: z.object({
      pattern: z.string().min(1).describe('Glob, e.g. "*.test.ts" or "src/**/index.ts"'),
      limit: z.number().int().min(1).max(200).optional().describe('Most paths to return (default 50)'),
    }),
  },
  get_active_note: {
    title: 'Get active note',
    description:
      'What the user has open in the editor: its path, the text they selected, and the fenced code block the cursor is in (when it is in one). Read the whole file with read_file.',
    inputSchema: z.object({}),
  },
  edit_file: {
    title: 'Edit file',
    description:
      "Propose changes to a note or code file: each edit replaces one exact piece of its current text. Read the file first and quote `find` exactly, with enough around it to match only once. Nothing is written until the user accepts hunks and explicitly applies the proposal.",
    inputSchema: z.object({
      path: z.string().min(1).describe('Vault-relative path of the file to change'),
      edits: z.array(z.object({
        find: z.string().min(1).describe('Exact text now in the file; must match exactly once'),
        replace: z.string().describe('The text to put in its place ("" deletes it)'),
      })).min(1).describe('Applied in order'),
      ...PROPOSAL_DETAILS,
    }),
  },
  create_file: {
    title: 'Create file',
    description:
      "Propose a new note (.md) or code file at a vault-relative path, with its folders. Never overwrites: if the path is taken, it says so. A note gets frontmatter with its title and created date when applied. Nothing is written until the user explicitly applies accepted hunks.",
    inputSchema: z.object({
      path: z.string().min(1).describe('Vault-relative path, e.g. "Projects/Launch plan.md"'),
      content: z.string().describe("The file's text"),
      ...PROPOSAL_DETAILS,
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
      `Propose a new note template in the vault's templates folder. Nothing is saved until the user explicitly applies accepted hunks; an existing template is never replaced. The body is checked first: if problems come back, fix them and call it again. Give it a short name without folders, use {{prompt:Label}} for values the user types each time, and read an existing template and use edit_file to change it.\n\n${TEMPLATE_SYNTAX_GUIDE}`,
    inputSchema: z.object({
      name: z.string().min(1).describe('Short template name, e.g. "Meeting notes" (no folders)'),
      body: z.string().min(1).describe("The template's text, with its fields, e.g. {{title}}, {{date}}, {{prompt:Owner}}, {{cursor}}"),
      ...PROPOSAL_DETAILS,
    }),
  },
};

export type CompanionToolName = keyof typeof COMPANION_TOOL_DEFS;
export const COMPANION_TOOL_NAMES = Object.keys(COMPANION_TOOL_DEFS) as CompanionToolName[];
