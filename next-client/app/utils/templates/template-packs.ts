import { JOURNAL, LOG_ENTRY, MEETING_NOTES, REPORT, SPEC } from "./template-starter";

// The template packs the app ships. "Add to vault" copies a pack's templates
// into `<templates folder>/<pack name>/` as plain files the user then owns:
// edit them, rename them, delete them. Nothing here is read again once added.
// Raw bodies: never expanded on write.

export interface BuiltinTemplate {
  /** File name without `.md`. */
  name: string;
  description: string;
  body: string;
}

export interface BuiltinPack {
  id: string;
  /** The folder name it's added under. */
  name: string;
  description: string;
  templates: BuiltinTemplate[];
}

const frontmatter = (fields: string[]) => ["---", ...fields, "---"];

// `file_name` names the note, so using one of these again the same day /
// week / month / year opens that note instead of making another.
const dated = (fileName: string, body: string[]) =>
  [...frontmatter(["target_folder: journal/{{year}}", `file_name: ${fileName}`]), ...body, ""].join("\n");

const DAILY = dated("{{date}}", JOURNAL.trimEnd().split("\n"));

const WEEKLY = dated("{{weekSheet}}", [
  "# Week {{week}}, {{year}}",
  "",
  "{{cursor}}",
  "",
  "## Went well",
  "- ",
  "",
  "## Next week",
  "- ",
]);

const MONTHLY = dated("{{monthSheet}}", [
  "# {{monthName}} {{year}}",
  "",
  "{{cursor}}",
  "",
  "## Highlights",
  "- ",
  "",
  "## Next month",
  "- ",
]);

const YEARLY = dated("{{yearSheet}}", [
  "# {{year}}",
  "",
  "{{cursor}}",
  "",
  "## What mattered",
  "- ",
  "",
  "## Next year",
  "- ",
]);

const ONE_ON_ONE = [
  ...frontmatter(["date: {{date}}", "with: {{prompt:With}}"]),
  "# 1:1 with {{prompt:With}}",
  "",
  "## Talking points",
  "- {{cursor}}",
  "",
  "## Action items",
  "- [ ] ",
  "",
].join("\n");

const STANDUP = [
  "# Standup {{date}}",
  "",
  "## Yesterday",
  "- {{cursor}}",
  "",
  "## Today",
  "- ",
  "",
  "## Blocked",
  "- ",
  "",
].join("\n");

const ESSAY = [
  ...frontmatter(["status: Draft"]),
  "# {{title}}",
  "",
  "{{cursor}}",
  "",
].join("\n");

const OUTLINE = [
  "# {{title}}",
  "",
  "## Point",
  "{{cursor}}",
  "",
  "## Why it matters",
  "",
  "## Sections",
  "1. ",
  "2. ",
  "3. ",
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

export const BUILTIN_PACKS: BuiltinPack[] = [
  {
    id: "journal",
    name: "Journal",
    description: "A page a day, plus weekly, monthly and yearly notes. Using one again opens the page you already started.",
    templates: [
      { name: "Daily", description: "Today's page, in journal/<year>, named by date", body: DAILY },
      { name: "Weekly", description: "This week's note, named like 2026-W42", body: WEEKLY },
      { name: "Monthly", description: "This month's note, named like 2026-10", body: MONTHLY },
      { name: "Yearly", description: "This year's note, named like 2026-year", body: YEARLY },
      { name: "Log entry", description: "One line starting with the time, to insert into any note", body: LOG_ENTRY },
    ],
  },
  {
    id: "meetings",
    name: "Meetings",
    description: "Notes for meetings, one-on-ones and standups.",
    templates: [
      { name: "Meeting notes", description: "Agenda, decisions, action items", body: MEETING_NOTES },
      { name: "One-on-one", description: "Talking points and action items, asks who it's with", body: ONE_ON_ONE },
      { name: "Standup", description: "Yesterday, today, blocked", body: STANDUP },
    ],
  },
  {
    id: "writing",
    name: "Writing",
    description: "A blank draft and an outline to think with.",
    templates: [
      { name: "Draft", description: "A title and a blank page", body: ESSAY },
      { name: "Outline", description: "The point, why it matters, sections", body: OUTLINE },
    ],
  },
  {
    id: "projects",
    name: "Projects",
    description: "Briefs, specs and reports for project work.",
    templates: [
      { name: "Project brief", description: "Goal, scope, milestones", body: PROJECT_BRIEF },
      { name: "Spec", description: "Author, status, summary, design", body: SPEC },
      { name: "Report", description: "Summary, findings, next steps", body: REPORT },
    ],
  },
];

// Which of a pack's templates already exist in `<templates folder>/<pack>/`
// (by file name, ignoring case), from the vault's indexed paths.
export function packTemplatesInVault(pack: BuiltinPack, templatesFolder: string, paths: string[]): Set<string> {
  const existing = new Set(paths.map((path) => path.toLowerCase()));
  return new Set(
    pack.templates
      .filter((template) => existing.has(`${templatesFolder}/${pack.name}/${template.name}.md`.toLowerCase()))
      .map((template) => template.name),
  );
}
