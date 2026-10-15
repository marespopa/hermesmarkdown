// The template packs the app ships. "Add to vault" copies a pack's templates
// into `templates/<pack name>/` as plain files the user then owns:
// edit them, rename them, delete them. Nothing here is read again once added.
// Raw bodies: never expanded on write.

import { FINANCE_PACK } from "./template-packs-finance";

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

// A dated page: today as the heading, the caret ready to write, and one
// gentle closing prompt.
const JOURNAL = [
  "# {{date:dddd, D MMMM}}",
  "",
  "{{cursor}}",
  "",
  "## Grateful for",
  "- ",
  "",
].join("\n");

// One timestamped line, inserted with /template wherever you are (for
// example at the end of a journal page): a log entry, not a page.
const LOG_ENTRY = "- {{time}} {{cursor}}\n";

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

const SPEC = [
  ...frontmatter(["author: {{prompt:Author}}", "status: Draft", "version: 0.1", "date: {{date}}"]),
  "# {{title}}",
  "",
  "## Summary",
  "{{cursor}}",
  "",
  "## Objective",
  "",
  "## Prerequisites",
  "",
  "## Design",
  "",
  "## Open questions",
  "- ",
  "",
  "## References",
  "- ",
  "",
].join("\n");

const REPORT = [
  ...frontmatter(["author: {{prompt:Author}}", "date: {{date}}"]),
  "# {{title}}",
  "",
  "## Summary",
  "{{cursor}}",
  "",
  "## Findings",
  "",
  "## Next steps",
  "- [ ] ",
  "",
  "## Notes",
  "",
].join("\n");

const lines = (body: string[]) => [...body, ""].join("\n");

const DAILY = JOURNAL;

// Links use date formats: `GGGG-[W]ww` is the ISO week's name
// (2026-W42), and date math reaches the one before (`{{date-1w:…}}`).
const WEEKLY = lines([
  "# Week {{date:ww}}, {{date:GGGG}}",
  "",
  "Last week: [[{{date-1w:GGGG-[W]ww}}]]",
  "",
  "{{cursor}}",
  "",
  "## Went well",
  "- ",
  "",
  "## Next week",
  "- ",
]);

const MONTHLY = lines([
  "# {{date:MMMM YYYY}}",
  "",
  "Last month: [[{{date-1m:YYYY-MM}}]]",
  "",
  "{{cursor}}",
  "",
  "## Highlights",
  "- ",
  "",
  "## Next month",
  "- ",
]);

const YEARLY = lines([
  "# {{date:YYYY}}",
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

// The ones below use blanks ({{name}}): what to fill in, with Tab to jump
// from one to the next.
const PRD = lines([
  ...frontmatter(["owner: {{prompt:Owner}}", "status: Draft", "release: {{prompt:Target release}}", "date: {{date}}"]),
  "# {{title}}",
  "",
  "## Problem",
  "{{cursor}}",
  "",
  "## Users and use cases",
  "- As a {{user_type}}, I want {{goal}} so that {{benefit}}",
  "",
  "## Requirements",
  "- [ ] {{requirement}}",
  "",
  "## Out of scope",
  "- {{left_for_later}}",
  "",
  "## Success metrics",
  "- {{metric}}: from {{baseline}} to {{target}}",
  "",
  "## Open questions",
  "- ",
]);

const BOOK_NOTE = lines([
  ...frontmatter(["author: {{prompt:Author}}", "type: book", "tags: [{{topic}}]"]),
  "# {{title}}",
  "",
  "## Summary",
  "{{cursor}}",
  "",
  "## Key ideas",
  "- {{key_idea}}",
  "",
  "## Quotes",
  "> {{quote}} (p. {{page_number}})",
  "",
  "## Related notes",
  "- [[{{related_note}}]]",
]);

const README = lines([
  "# {{title}}",
  "",
  "{{cursor}}",
  "",
  "## Features",
  "- **{{feature}}**: {{what_it_does}}",
  "",
  "## Installation",
  "```sh",
  "{{install_command}}",
  "```",
  "",
  "## Usage",
  "```",
  "{{usage_example}}",
  "```",
  "",
  "## License",
  "{{license}}",
]);

// An architecture decision record: one decision, why, and what it costs.
const ADR = lines([
  ...frontmatter(["status: Proposed", "date: {{date}}", "deciders: {{prompt:Deciders}}"]),
  "# {{title}}",
  "",
  "## Context",
  "{{cursor}}",
  "",
  "## Options considered",
  "1. {{option_a}}",
  "2. {{option_b}}",
  "",
  "## Decision",
  "{{chosen_option}}, because {{reason}}",
  "",
  "## Consequences",
  "- Good: {{upside}}",
  "- Bad: {{downside}}",
]);

export const BUILTIN_PACKS: BuiltinPack[] = [
  {
    id: "journal",
    name: "Journal",
    description: "A page a day, plus weekly, monthly and yearly notes.",
    templates: [
      { name: "Daily", description: "Today's date as the heading, room to write", body: DAILY },
      { name: "Weekly", description: "This week, with a link to last week's", body: WEEKLY },
      { name: "Monthly", description: "This month, with a link to last month's", body: MONTHLY },
      { name: "Yearly", description: "This year: what mattered, what's next", body: YEARLY },
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
    description: "A blank draft, an outline to think with, and notes on what you read.",
    templates: [
      { name: "Draft", description: "A title and a blank page", body: ESSAY },
      { name: "Outline", description: "The point, why it matters, sections", body: OUTLINE },
      { name: "Book note", description: "Summary, key ideas, quotes, asks for the author", body: BOOK_NOTE },
    ],
  },
  {
    id: "projects",
    name: "Projects",
    description: "Briefs, requirements, specs and reports for project work.",
    templates: [
      { name: "Project brief", description: "Goal, scope, milestones", body: PROJECT_BRIEF },
      { name: "PRD", description: "Problem, users, requirements, success metrics", body: PRD },
      { name: "Spec", description: "Author, status, summary, design", body: SPEC },
      { name: "Report", description: "Summary, findings, next steps", body: REPORT },
    ],
  },
  {
    id: "engineering",
    name: "Engineering",
    description: "A README and decision records for code and systems.",
    templates: [
      { name: "README", description: "What it does, features, installation, usage", body: README },
      { name: "Decision record", description: "Context, options, decision, consequences", body: ADR },
    ],
  },
  FINANCE_PACK,
];

// Which of a pack's templates already exist in `templates/<pack>/`
// (by file name, ignoring case), from the vault's indexed paths.
export function packTemplatesInVault(pack: BuiltinPack, templatesFolder: string, paths: string[]): Set<string> {
  const existing = new Set(paths.map((path) => path.toLowerCase()));
  return new Set(
    pack.templates
      .filter((template) => existing.has(`${templatesFolder}/${pack.name}/${template.name}.md`.toLowerCase()))
      .map((template) => template.name),
  );
}
