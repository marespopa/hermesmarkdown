// The built-in note templates: a couple of examples, used straight from
// memory, never written to the vault on their own. Templates are the user's
// own: the template wizard starts one blank or from an example (copied into
// `_templates/` under the name given), and the picker offers the examples
// after the vault's own. Raw bodies: never expanded on write.

import type { TemplateEntry } from "./template-registry";

export interface BuiltinTemplate {
  /** File name without `.md`; may hold folders ("Meetings/Kickoff"). */
  name: string;
  description: string;
  body: string;
}

// A built-in folder template (template-folders.ts): its folder name and the
// notes it makes.
export interface BuiltinPack {
  id: string;
  /** The folder name it's copied under. */
  name: string;
  /** What's shown when the folder name isn't readable (a folder template's prompt name). */
  displayName?: string;
  description: string;
  templates: BuiltinTemplate[];
}

const frontmatter = (fields: string[]) => ["---", ...fields, "---"];

const MEETING_NOTES = [
  ...frontmatter(["date: {{date}}", "attendees: {{prompt:Attendees}}"]),
  "# {{title}}",
  "",
  "## Agenda",
  "- {{cursor}}",
  "",
  "## Decisions",
  "- ",
  "",
  "## Action items",
  "- [ ] ",
  "",
  "## Open questions",
  "- ",
  "",
  "## Next steps",
  "- ",
  "",
].join("\n");

const PROJECT_BRIEF = [
  ...frontmatter(["owner: {{prompt:Owner}}", "status: Planned", "date: {{date}}"]),
  "# {{title}}",
  "",
  "## Goal",
  "{{cursor}}",
  "",
  "## Scope",
  "- ",
  "",
  "## Milestones",
  "- [ ] ",
  "",
].join("\n");

// The empty-note pills (before the vault has templates of its own, or with
// no vault at all), the template picker after the vault's own, and the
// template wizard's note examples. Paths are ids, never files.
export const STARTER_TEMPLATES: TemplateEntry[] = [
  { name: "Meeting notes", path: "builtin:meetings/Meeting notes", description: "Agenda, decisions, action items", body: MEETING_NOTES },
  { name: "Project brief", path: "builtin:projects/Project brief", description: "Goal, scope, milestones", body: PROJECT_BRIEF },
];

// The starters for the template picker, listed under "Built-in", without any
// the vault already has a template of the same name for.
export function builtinNoteTemplates(vaultTemplates: TemplateEntry[]): TemplateEntry[] {
  const taken = new Set(vaultTemplates.map((t) => t.name.toLowerCase()));
  return STARTER_TEMPLATES
    .filter((t) => !taken.has(t.name.toLowerCase()))
    .map((t) => ({ ...t, pack: "Built-in" }));
}
