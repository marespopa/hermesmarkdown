import { TEMPLATE_SYNTAX_GUIDE } from "@/app/utils/templates/template-lint";

// Chat skills: extra instructions added to the AI companion's system prompt while a
// keyword or a slash command in the thread turns them on. The template skill
// has the companion save templates with its create_template tool (checked
// first, undone with the turn); the tasks skill also sends data the app
// gathers (use-chat-skills.ts); the code skill steers reading and editing code
// files and fenced blocks.

export type ChatSkillId = "create-template" | "tasks" | "code";

export interface ChatSkill {
  id: ChatSkillId;
  /** Starting a message with this turns the skill on, e.g. `/template`. */
  command: string;
  trigger: RegExp;
  /** The skill's instructions; skills live in the app, never in the vault. */
  builtin: string;
}

const TEMPLATE_SKILL_BUILTIN = [
  "Skill: create HermesMarkdown note templates.",
  "When the user asks for a template, save it with the create_template tool: it lands in the vault's templates folder, where the template picker finds it.",
  "",
  TEMPLATE_SYNTAX_GUIDE,
  "",
  "Example body for a template named \"RFC\":",
  "# {{title}}",
  "Owner: {{prompt:Owner}}",
  "{{cursor}}",
  "",
  "Rules:",
  "- Give it a short name, without folders.",
  "- Use {{prompt:Label}} for values the user should type in each time; reuse the same label for the same value.",
  "- create_template checks the body first. If it lists problems, fix them and call it again; don't tell the user it's saved until it says so.",
  "- To change an existing template, read it and use edit_file; create_template never replaces one.",
  "- After saving, say in one short line what the template does and its name.",
].join("\n");

export const TEMPLATE_SKILL: ChatSkill = {
  id: "create-template",
  command: "/template",
  trigger: /\btemplates?\b/i,
  builtin: TEMPLATE_SKILL_BUILTIN,
};

const TASKS_SKILL_BUILTIN = [
  "Skill: work with the user's HermesMarkdown tasks.",
  "OPEN TASKS below lists the vault's open tasks (to do, in progress, on hold) with their note. Use it to answer what's due, what to work on next, or what's stuck; never invent tasks that aren't in it.",
  "When asked to turn text (a note, meeting notes, an email) into tasks:",
  "- Write one task per line as - [ ] Short imperative action, starting with a verb.",
  "- Add @due(YYYY-MM-DD) only when the text gives a date or deadline, worked out from today's date below. Add @priority(high|med|low) only when the text says how urgent it is.",
  "- Keep #tags the user already uses for the same topic.",
  "- Use [/] only for work the text says is under way, [!] for work it says is blocked.",
  "When asked to plan a day or pick what's next, prefer in-progress and overdue tasks, then those due soon, then high priority, and say why in a few words.",
  "To change a task, read its note and edit its line there with edit_file; to add tasks to a note, edit that note.",
].join("\n");

export const TASKS_SKILL: ChatSkill = {
  id: "tasks",
  command: "/tasks",
  trigger: /\b(?:tasks?|to-?dos?|action items?|next actions?)\b/i,
  builtin: TASKS_SKILL_BUILTIN,
};

const CODE_SKILL_BUILTIN = [
  "Skill: help with code in the user's vault (code files and fenced code blocks in notes).",
  "When the user says \"this code\", \"this function\" or \"here\", call get_active_note first: it gives the open file, the selection and the code block at the cursor.",
  "Before changing code:",
  "- Read the whole file (read_file) or the note with the block, never just a guess at its contents.",
  "- Keep the file's language, style, naming, indentation and comment density; change only what the request needs.",
  "Changing code:",
  "- A code file: edit_file, quoting the exact lines to replace; prefer several small edits to rewriting the file.",
  "- A fenced block in a note: edit_code_block with the block's index or its language and first line.",
  "- Code isn't run here, so reason about it carefully: check names, imports and types against what you read, and say what you couldn't verify.",
  "Answering:",
  "- To explain code, walk through what it does in order, then anything surprising (edge cases, bugs, slow parts).",
  "- To review, list concrete problems first, most serious first, each with the line and a fix; skip style nits unless asked.",
  "- To fix an error the user pasted, find the line it points to, say the cause in one sentence, then fix it.",
  "- To write tests, match the test framework and file naming the vault already uses.",
  "- After an edit, say in a line or two what changed and why.",
].join("\n");

export const CODE_SKILL: ChatSkill = {
  id: "code",
  command: "/code",
  trigger: /\b(?:code|refactor(?:ing)?|stack ?trace|unit tests?)\b/i,
  builtin: CODE_SKILL_BUILTIN,
};

export const CHAT_SKILLS: ChatSkill[] = [TEMPLATE_SKILL, TASKS_SKILL, CODE_SKILL];

export function isSkillActive(skill: ChatSkill, userTexts: string[]): boolean {
  return userTexts.some((text) => text.trimStart().toLowerCase().startsWith(skill.command) || skill.trigger.test(text));
}
