// The folder templates the app ships. Used straight from memory by "New from
// folder template…" (builtinFolderSource), so nothing is written to the vault
// until the user copies one there (Templates page, or the template wizard) to
// change it, under `_templates/<folder name>/`. The README's `scaffold: true`
// makes it a folder template (folder-template.ts), and the folder's name, a
// prompt, names the folder it creates; the README's `{{title}}` is that name. Same shape as a pack (nested file names such as
// "Meetings/Kickoff"), so the same card, writer and presence check serve both.
// Raw bodies: never expanded on write.

import type { ScaffoldSource, ScaffoldSourceEntry } from "./folder-template";
import type { BuiltinPack } from "./template-packs";

const PROJECT_README = [
  "---",
  "scaffold: true",
  "---",
  "# {{title}}",
  "",
  "## Goal",
  "- ",
  "",
  "## Scope",
  "- In: ",
  "- Out: ",
  "",
  "## Milestones",
  "- [ ] ",
  "",
].join("\n");

const PROJECT_TASKS = [
  "# Tasks",
  "",
  "- [ ] Define the first release",
  "- [ ] Write the launch checklist",
  "- [ ] Review open questions",
  "",
].join("\n");

const PROJECT_DECISIONS = [
  "# Decisions",
  "",
  "## {{date}}: Project started",
  "- Decision: ",
  "- Why: ",
  "",
].join("\n");

const PROJECT_KICKOFF = [
  "# Kickoff",
  "",
  "## Agenda",
  "- Goal and scope",
  "- Milestones",
  "",
  "## Decisions",
  "- ",
  "",
  "## Action items",
  "- [ ] ",
  "",
].join("\n");

export const BUILTIN_FOLDER_TEMPLATES: BuiltinPack[] = [
  {
    id: "project-folder",
    name: "{{Project name}}",
    displayName: "Project folder",
    description: "A project to start from: asks for its name, then makes the notes below inside a folder of that name.",
    templates: [
      { name: "README", description: "Goal, Scope and Milestones (marks the folder as a template)", body: PROJECT_README },
      { name: "Tasks", description: "A few tasks to tick off", body: PROJECT_TASKS },
      { name: "Decisions", description: "A dated decision log", body: PROJECT_DECISIONS },
      { name: "Meetings/Kickoff", description: "Agenda, decisions and action items", body: PROJECT_KICKOFF },
    ],
  },
];

// A built-in folder template as if read from disk: folders before their
// contents, siblings by name, every file a `.md` note.
export function builtinFolderSource(pack: BuiltinPack): ScaffoldSource {
  const files = pack.templates.map((t) => `${t.name}.md`);
  const folders = new Set<string>();
  for (const path of files) {
    const segments = path.split("/").slice(0, -1);
    segments.forEach((_, i) => folders.add(segments.slice(0, i + 1).join("/")));
  }
  const byPath = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  const entries: ScaffoldSourceEntry[] = [];
  const visit = (prefix: string) => {
    const inHere = (path: string) => path.startsWith(prefix ? `${prefix}/` : "") && !path.slice(prefix ? prefix.length + 1 : 0).includes("/");
    for (const folder of [...folders].filter(inHere).sort(byPath)) {
      entries.push({ path: folder, kind: "folder" });
      visit(folder);
    }
    for (const path of files.filter(inHere).sort(byPath)) {
      entries.push({ path, kind: "file", text: pack.templates.find((t) => `${t.name}.md` === path)!.body });
    }
  };
  visit("");
  return { name: pack.name, entries };
}
