import { resolveFileHandleAtPath } from "@/app/atoms/vault-atoms";
import { templateBody } from "@/app/utils/templates/template-frontmatter";
import { TEMPLATE_SYNTAX_GUIDE } from "@/app/utils/templates/template-lint";
import { sanitizeTemplateFileName } from "@/app/utils/templates/template-registry";

// Chat skills: extra instructions added to the AI Chat system prompt while a
// keyword or a slash command in the thread turns them on. The template skill
// answers with a fenced block the user saves from a card; the weekly review
// and tasks skills also send data the app gathers (use-chat-skills.ts). Nothing
// is written without the user's click.

export type ChatSkillId = "create-template" | "weekly-review" | "tasks";

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
  "When the user asks for a template, write it as a template file the user can save into their templates folder.",
  "",
  TEMPLATE_SYNTAX_GUIDE,
  "",
  "Output format: put each template in its own block fenced with four tildes, with the file name after the info string, exactly like this:",
  "~~~~hermes-template rfc.md",
  "---",
  "target_folder: rfcs",
  "file_name: rfc-{{date}}-{{slug}}",
  "---",
  "# {{title}}",
  "Owner: {{prompt:Owner}}",
  "{{cursor}}",
  "~~~~",
  "",
  "Rules:",
  "- Use a short lowercase file name ending in .md, without folders.",
  "- Only add target_folder / file_name when the user wants new notes placed or named a certain way.",
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

const WEEKLY_REVIEW_SKILL_BUILTIN = [
  "Skill: weekly review of the user's worklog.",
  "The WEEK DATA below is each of the week's daily sheets. Tasks are written - [ ] to do, - [/] in progress, - [!] on hold, - [x] done, - [-] cancelled.",
  "Write the review from that data only. Never invent work, numbers or dates. If the data is thin, say so in one line and keep the review short.",
  "",
  "Default shape (follow the user's wording when they ask for something else, like a status report for a manager or a short recap):",
  "## Highlights: the 3 to 5 most meaningful things done, each linking its day ([[2026-10-06]]).",
  "## Blocked: what is stuck and, when the sheets say, why.",
  "## Carry over: the open tasks worth taking into next week, as task lines (- [ ] or - [/]) keeping their @due() and @priority().",
  "## Next week: 2 or 3 focus points that follow from the above.",
  "",
  "Write it ready to paste into the user's weekly sheet. Pick what matters; don't list every done task.",
].join("\n");

export const WEEKLY_REVIEW_SKILL: ChatSkill = {
  id: "weekly-review",
  command: "/review",
  trigger: /\b(?:weekly|week'?s|week)\s+(?:review|recap|retro|summary|report)\b|\b(?:review|recap|summari[sz]e)\s+(?:my|this|last|the)\s+week\b/i,
  builtin: WEEKLY_REVIEW_SKILL_BUILTIN,
  overridePath: ".hermes/skills/weekly-review.md",
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
  "You can't edit existing tasks. To change one, give the revised task line so the user can apply it in its note. New tasks can go into today's sheet with add_to_today, when that tool is available and the user asks.",
].join("\n");

export const TASKS_SKILL: ChatSkill = {
  id: "tasks",
  command: "/tasks",
  trigger: /\b(?:tasks?|to-?dos?|action items?|next actions?)\b/i,
  builtin: TASKS_SKILL_BUILTIN,
  overridePath: ".hermes/skills/tasks.md",
};

export const CHAT_SKILLS: ChatSkill[] = [TEMPLATE_SKILL, WEEKLY_REVIEW_SKILL, TASKS_SKILL];

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
