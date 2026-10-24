import type { FileMetadata } from "@/app/atoms/metadata";
import { resolveFileHandleAtPath } from "@/app/atoms/vault-atoms";
import { noteTypeOf } from "@/app/utils/note-type";
import { templateBody } from "@/app/utils/templates/template-frontmatter";

// Skills the user writes in their own vault: any note whose type is `skill`
// (`type: skill` in its frontmatter, or a #type/skill tag), anywhere. Its
// text after the frontmatter is the skill's instructions; a chat message
// starting with `/<name>` (the file name without `.md`, lowercased, spaces as
// hyphens) turns it on for the thread. Read fresh each turn; the app never
// creates or changes them. The built-in skills (chat-skills.ts) live in the
// app, and keep their commands.
export interface UserSkill {
  path: string;
  command: string;
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
    if (noteTypeOf(metadata[path]) !== "skill") continue;
    const command = skillCommandFor(path);
    if (command === "/" || taken.has(command)) continue;
    taken.add(command);
    skills.push({ path, command });
  }
  return skills;
}

// On when a user message starts with the command, as a word (`/standup`,
// `/standup notes`, not `/standups`).
export function isUserSkillActive(skill: UserSkill, userTexts: string[]): boolean {
  return userTexts.some((text) => {
    const start = text.trimStart().toLowerCase();
    return start.startsWith(skill.command) && !/[\w-]/.test(start.charAt(skill.command.length));
  });
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
