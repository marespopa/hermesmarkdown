import { resolveFileHandleAtPath } from "@/app/atoms/vault-atoms";
import { templateBody } from "@/app/utils/templates/template-frontmatter";
import { TEMPLATE_SYNTAX_GUIDE } from "@/app/utils/templates/template-lint";
import { sanitizeTemplateFileName } from "@/app/utils/templates/template-registry";

// Chat skills: extra instructions added to the AI Chat system prompt while a
// keyword or a slash command in the thread turns them on. The template skill
// answers with a fenced block the user saves from a card; the tasks skill
// also sends data the app gathers (use-chat-skills.ts). Nothing
// is written without the user's click.

export type ChatSkillId = "create-template" | "tasks";

export interface ChatSkill {
  id: ChatSkillId;
  /** Starting a message with this turns the skill on, e.g. `/template`. */
  command: string;
  trigger: RegExp;
  builtin: string;
  /** Vault-relative plain-Markdown file whose body replaces `builtin` when present. */
  overridePath: string;
}

export const TEMPLATE_BLOCK_INFO = "hermes-template";

const TEMPLATE_SKILL_BUILTIN = [
  "Skill: create HermesMarkdown note templates.",
  "When the user asks for a template, write it as a template file the user can save into the vault's templates/ folder.",
  "",
  TEMPLATE_SYNTAX_GUIDE,
  "",
  "Output format: put each template in its own block fenced with four tildes, with the file name after the info string, exactly like this:",
  "~~~~hermes-template rfc.md",
  "# {{title}}",
  "Owner: {{prompt:Owner}}",
  "{{cursor}}",
  "~~~~",
  "",
  "Rules:",
  "- Use a short lowercase file name ending in .md, without folders.",
  "- Use {{prompt:Label}} for values the user should type in each time; reuse the same label for the same value.",
  "- Keep a short sentence before the block saying what the template does. Don't claim it is saved: the user saves it with the Save template button.",
].join("\n");

export const TEMPLATE_SKILL: ChatSkill = {
  id: "create-template",
  command: "/template",
  trigger: /\btemplates?\b/i,
  builtin: TEMPLATE_SKILL_BUILTIN,
  overridePath: ".hermes/skills/create-template.md",
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
  "You can't edit existing tasks. To change one, give the revised task line so the user can apply it in its note.",
].join("\n");

export const TASKS_SKILL: ChatSkill = {
  id: "tasks",
  command: "/tasks",
  trigger: /\b(?:tasks?|to-?dos?|action items?|next actions?)\b/i,
  builtin: TASKS_SKILL_BUILTIN,
  overridePath: ".hermes/skills/tasks.md",
};

export const CHAT_SKILLS: ChatSkill[] = [TEMPLATE_SKILL, TASKS_SKILL];

export function isSkillActive(skill: ChatSkill, userTexts: string[]): boolean {
  return userTexts.some((text) => text.trimStart().toLowerCase().startsWith(skill.command) || skill.trigger.test(text));
}

// The vault override's body (after its frontmatter), read fresh each time;
// the built-in text when there is no vault, no file, an empty one or a read error.
export async function loadSkillInstructions(
  skill: ChatSkill,
  vaultHandle: FileSystemDirectoryHandle | null,
): Promise<string> {
  if (!vaultHandle) return skill.builtin;
  try {
    const handle = await resolveFileHandleAtPath(vaultHandle, skill.overridePath);
    const body = templateBody(await (await handle.getFile()).text()).trim();
    return body || skill.builtin;
  } catch {
    return skill.builtin;
  }
}

export interface TemplateBlock {
  /** Sanitized base file name, always ending in `.md`. */
  fileName: string;
  content: string;
}

// Every `~~~~hermes-template <name>` … `~~~~` block in a reply. The 4-tilde
// fence lets the template itself contain ``` code blocks.
export function parseTemplateBlocks(reply: string): TemplateBlock[] {
  const text = reply.replace(/\r\n/g, "\n");
  const blocks: TemplateBlock[] = [];
  // Group 3 is the body up to and including its last newline; the closing
  // fence must start a line and repeat the opening tildes exactly.
  const fence = /^(~{4,})[ \t]*hermes-template\b[ \t]*([^\n]*)\n((?:[\s\S]*?\n)?)\1[ \t]*$/gm;
  for (const match of text.matchAll(fence)) {
    blocks.push({ fileName: sanitizeTemplateFileName(match[2]), content: match[3] });
  }
  return blocks;
}
