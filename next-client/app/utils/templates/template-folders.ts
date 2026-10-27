// The folder templates the app ships: two examples. Used straight from memory
// by "New from folder template…" (builtinFolderSource), so nothing is written
// to the vault until the user starts a template of their own from one (the
// template wizard), under `_templates/<name>/`. The README's `scaffold: true`
// makes it a folder template (folder-template.ts), and the folder's name, a
// prompt, names the folder it creates; the README's `{{title}}` is that name.
// Nested file names ("Meetings/Kickoff") make subfolders. Raw bodies: never
// expanded on write.

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

const RESEARCH_README = [
  "---",
  "scaffold: true",
  "---",
  "# {{title}}",
  "",
  "## Question",
  "- ",
  "",
  "## Findings",
  "- ",
  "",
  "## Next steps",
  "- [ ] ",
  "",
].join("\n");

const RESEARCH_SOURCES = [
  "# Sources",
  "",
  "| Source | Takeaway |",
  "| --- | --- |",
  "| Name or link | - |",
  "",
].join("\n");

const RESEARCH_QUESTIONS = [
  "# Open questions",
  "",
  "- [ ] What do we already know?",
  "- [ ] What would change the decision?",
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
  {
    id: "research-folder",
    name: "{{Research topic}}",
    displayName: "Research folder",
    description: "A topic to look into: asks for its name, then makes the notes below inside a folder of that name.",
    templates: [
      { name: "README", description: "Question, Findings and Next steps (marks the folder as a template)", body: RESEARCH_README },
      { name: "Sources", description: "A table of sources and what each one says", body: RESEARCH_SOURCES },
      { name: "Open questions", description: "Questions to answer, as tasks", body: RESEARCH_QUESTIONS },
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
