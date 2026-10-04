import { resolveFileHandleAtPath } from "@/app/atoms/vault-atoms";
import { templateBody } from "@/app/utils/templates/template-frontmatter";
import { TEMPLATE_SYNTAX_GUIDE } from "@/app/utils/templates/template-lint";
import { sanitizeTemplateFileName } from "@/app/utils/templates/template-registry";

// Chat skills: extra instructions added to the AI Chat system prompt while a
// keyword in the thread turns them on. Only the template skill exists. Its
// output is a fenced block the user saves from a card; nothing is written
// without that click.

export interface ChatSkill {
  id: "create-template";
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
  trigger: /\btemplates?\b/i,
  builtin: TEMPLATE_SKILL_BUILTIN,
  overridePath: ".hermes/skills/create-template.md",
};

export function isSkillActive(skill: ChatSkill, userTexts: string[]): boolean {
  return userTexts.some((text) => text.trimStart().startsWith("/template") || skill.trigger.test(text));
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
