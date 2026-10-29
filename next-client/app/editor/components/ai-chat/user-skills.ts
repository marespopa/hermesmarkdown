import type { FileMetadata } from "@/app/atoms/metadata";
import { resolveFileHandleAtPath } from "@/app/atoms/vault-atoms";
import { noteTypeOf } from "@/app/utils/note-type";
import { templateBody } from "@/app/utils/templates/template-frontmatter";
import { startsWithCommand } from "./chat-skills";
import { COMPANION_SKILL_TOOL_BINDINGS, type CompanionToolName } from "@/app/services/companion-tool-defs";
import { PROJECT_CHECKS, type ProjectCheckId } from "@/app/services/project-checks";

// Skills the user writes in their own vault: any note whose type is `skill`
// (`type: skill` in its frontmatter, or a #type/skill tag), anywhere. Its
// text after the frontmatter is the skill's instructions; a chat message
// starting with `/<name>` (the file name without `.md`, lowercased, spaces as
// hyphens) carries it, and the companion can load it itself (load_skill),
// told when by its `description:` frontmatter. Read fresh on use; the app never
// can create or edit these declarative notes through the AI settings wizard. The built-in skills (chat-skills.ts) live in the
// app, and keep their commands.
export interface UserSkill {
  path: string;
  command: string;
  description?: string;
  toolBindings?: CompanionToolName[];
  projectChecks?: ProjectCheckId[];
  validationWarnings?: string[];
}

export function isUserSkill(metadata: FileMetadata): boolean {
  return noteTypeOf(metadata) === "skill";
}

export function skillCommandFor(path: string): string {
  const name = (path.split("/").pop() ?? path).replace(/\.md$/i, "");
  return `/${name.trim().toLowerCase().replace(/\s+/g, "-")}`;
}

// The vault's skill notes, by path, leaving out any whose command is taken
// (by a built-in skill or an earlier note).
export function userSkillsFrom(metadata: Record<string, FileMetadata>, takenCommands: readonly string[]): UserSkill[] {
  const taken = new Set(takenCommands);
  const skills: UserSkill[] = [];
  for (const path of Object.keys(metadata).sort()) {
    if (!isUserSkill(metadata[path])) continue;
    const command = skillCommandFor(path);
    if (command === "/" || taken.has(command)) continue;
    taken.add(command);
    const frontmatter = metadata[path].frontmatter ?? {};
    const description = frontmatter.description;
    const toolBindings = skillBindings(frontmatter.tools, COMPANION_SKILL_TOOL_BINDINGS, "tool");
    const projectChecks = skillBindings(frontmatter.checks, PROJECT_CHECKS.map(({ id }) => id), "check");
    skills.push({
      path, command,
      ...(typeof description === "string" && description.trim() ? { description: description.trim() } : {}),
      ...(toolBindings.values ? { toolBindings: toolBindings.values as CompanionToolName[] } : {}),
      ...(projectChecks.values ? { projectChecks: projectChecks.values as ProjectCheckId[] } : {}),
      ...((toolBindings.warnings.length || projectChecks.warnings.length) ? { validationWarnings: [...toolBindings.warnings, ...projectChecks.warnings] } : {}),
    });
  }
  return skills;
}

function skillBindings(value: unknown, allowed: readonly string[], label: string) {
  if (value === undefined) return { values: undefined, warnings: [] as string[] };
  if (!Array.isArray(value)) return { values: undefined, warnings: [`${label} bindings must be a list.`] };
  const values: string[] = [];
  const warnings: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !item.trim()) { warnings.push(`Malformed ${label} binding.`); continue; }
    if (values.includes(item)) { warnings.push(`Duplicate ${label} binding: ${item}.`); continue; }
    if (!allowed.includes(item)) { warnings.push(`Unknown or disallowed ${label}: ${item}.`); continue; }
    values.push(item);
  }
  return { values, warnings };
}

// On when the message starts with the command, as a word (`/standup`,
// `/standup notes`, not `/standups`).
export function isUserSkillActive(skill: UserSkill, text: string): boolean {
  return startsWithCommand(text, skill.command);
}

// The note's text after its frontmatter, read from disk; null when it's gone,
// empty or unreadable (the skill is then left out of the turn).
export async function readUserSkill(vault: FileSystemDirectoryHandle, path: string): Promise<string | null> {
  try {
    const handle = await resolveFileHandleAtPath(vault, path);
    const body = templateBody(await (await handle.getFile()).text()).trim();
    return body || null;
  } catch {
    return null;
  }
}
