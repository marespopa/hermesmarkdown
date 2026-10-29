import { z } from 'zod';
import { NOTE_TOOL_DEFS } from './note-tool-defs';

// The AI companion's tools: the note tools (search_notes, read_note,
// list_open_tasks), the vault and editor read tools (list_folder, read_file,
// search_files, find_files, check_file), git_status and git_diff, update_plan, load_skill, the edits,
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
  check_file: {
    title: 'Check file',
    description:
      "Check one file for syntax problems, after you write it or when asked: JSON and YAML are parsed, code files go through a language parser (JavaScript, TypeScript, CSS, HTML, Python, Rust, Go, Java, PHP, SQL and more), and a note's frontmatter, unclosed code fences, [[links]] that match no file and fenced code are checked. Syntax only: it can't check types, imports or behaviour, and you can't run tests, so say that the user should.",
    inputSchema: z.object({
      path: z.string().min(1).describe('Vault-relative path of the file to check'),
    }),
  },
  git_status: {
    title: 'Git status',
    description:
      "Which files of the vault differ from the last commit (git HEAD) and how many lines changed in each. Read only: you can't commit, push or stage; the user does that in their terminal. Say so if asked, and name the files they would commit.",
    inputSchema: z.object({}),
  },
  git_diff: {
    title: 'Git diff',
    description:
      "The line changes of files since the last commit (git HEAD), as diff hunks: one file or folder with `path`, or every changed file without it. Use it to review what has changed, including your own edits this turn. Read only.",
    inputSchema: z.object({
      path: z.string().optional().describe('Vault-relative file or folder; leave out for every changed file'),
    }),
  },
  update_plan: {
    title: 'Update plan',
    description:
      "Keep a checklist of the steps of a multi-step job, such as a coding plan. Send the whole list each time with each step's status: pending, in_progress (one at a time) or done. Call it when you start a plan and as each step finishes, so the user sees progress. It changes no files.",
    inputSchema: z.object({
      steps: z.array(z.object({
        text: z.string().min(1).describe('The step, in a few words'),
        status: z.enum(['pending', 'in_progress', 'done']),
      })).min(1).describe('Every step of the plan, in order'),
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
  write_file: {
    title: 'Write file',
    description:
      "Replace a file's whole text, or create it (with its folders) when it doesn't exist. Use it to rewrite a file or when most of it changes; for a few changes use edit_file. Give the complete new text: whatever you leave out is gone. The change is saved at once and the user can undo the whole turn.",
    inputSchema: z.object({
      path: z.string().min(1).describe('Vault-relative path, e.g. "src/index.ts"'),
      content: z.string().describe("The file's complete new text"),
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
      "Create a new note (.md) or code file at a vault-relative path, with its folders. Never overwrites: if the path is taken, it says so. A note gets frontmatter with its title and created date unless its content already sets them; add any other fields (tags, status) in a frontmatter block at the top. The user can undo the whole turn.",
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
  'edit_file', 'write_file', 'edit_code_block', 'create_file', 'create_folder', 'rename', 'move', 'create_template',
];

// All vault-mutating tools. Planning turns omit these from the server's tool
// contract, while update_plan remains available to render the checklist.
export const COMPANION_MUTATING_TOOL_NAMES: CompanionToolName[] = [
  ...COMPANION_WRITE_TOOL_NAMES,
  'trash',
];
