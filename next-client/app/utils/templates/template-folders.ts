// The folder templates the app ships, offered on the Templates page next to
// the packs (BUILTIN_PACKS). "Add to vault" writes the files under
// `_templates/<folder name>/`; the README's `scaffold: true` makes it a folder
// template (folder-template.ts), and the folder's name, a prompt, names the
// folder it creates. Same shape as a pack (nested file names such as
// "Meetings/Kickoff"), so the same card, writer and presence check serve both.
// Raw bodies: never expanded on write.

import type { BuiltinPack } from "./template-packs";

const PROJECT_README = [
  "---",
  "scaffold: true",
  "---",
  "# {{prompt:Project name}}",
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
    name: "{{prompt:Project name}}",
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
