// The template packs the app ships. "Add to vault" copies a pack's templates
// into `_templates/<pack name>/` as plain files the user then owns:
// edit them, rename them, delete them. Nothing here is read again once added.
// Raw bodies: never expanded on write.

import { FINANCE_PACK } from "./template-packs-finance";
import type { TemplateEntry } from "./template-registry";

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
  "## Getting started",
  "### Prerequisites",
  "- {{prerequisite}}",
  "",
  "### Installation",
  "```sh",
  "{{install_command}}",
  "```",
  "",
  "## Usage",
  "```",
  "{{usage_example}}",
  "```",
  "",
  "## Contributing",
  "Pull requests are welcome. For a larger change, open an issue first to discuss it.",
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
  "## Decision drivers",
  "- {{driver}}",
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

// A bug report: what happens, how to make it happen, and where.
const BUG_REPORT = lines([
  ...frontmatter(["status: Open", "date: {{date}}"]),
  "# {{title}}",
  "",
  "## Description",
  "{{cursor}}",
  "",
  "## Steps to reproduce",
  "1. ",
  "2. ",
  "3. ",
  "",
  "## Expected behavior",
  "",
  "## Actual behavior",
  "",
  "## Environment",
  "- OS: {{os}}",
  "- Browser or app version: {{version}}",
]);

// A design doc: the plan for a larger feature, before the code.
const DESIGN_DOC = lines([
  ...frontmatter(["author: {{prompt:Author}}", "status: Draft", "date: {{date}}"]),
  "# {{title}}",
  "",
  "## Overview",
  "{{cursor}}",
  "",
  "## Goals",
  "- ",
  "",
  "## Non-goals",
  "- ",
  "",
  "## Proposed solution",
  "### Architecture",
  "",
  "### Data model and schema changes",
  "",
  "## Operational concerns",
  "- **Security**: ",
  "- **Performance**: ",
  "- **Monitoring**: ",
  "",
  "## Open questions",
  "- ",
]);

// A changelog in the Keep a Changelog shape: newest release first.
const CHANGELOG = lines([
  "# Changelog",
  "",
  "All notable changes to this project are documented in this file.",
  "",
  "## [Unreleased]",
  "### Added",
  "- {{cursor}}",
  "",
  "### Changed",
  "- ",
  "",
  "### Fixed",
  "- ",
  "",
  "## [{{version}}] - {{date}}",
  "### Added",
  "- ",
]);

// A pull request description: what changed, what kind of change, a checklist.
const PULL_REQUEST = lines([
  "# {{title}}",
  "",
  "## Description",
  "{{cursor}}",
  "",
  "Fixes {{issue}}",
  "",
  "## Type of change",
  "- [ ] Bug fix",
  "- [ ] New feature",
  "- [ ] Breaking change",
  "- [ ] Documentation",
  "",
  "## Checklist",
  "- [ ] Follows the project's code style",
  "- [ ] Self-reviewed",
  "- [ ] Tests added for the change",
  "- [ ] Existing tests pass",
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
    description: "READMEs, decision records, design docs and the rest of a code project's writing.",
    templates: [
      { name: "README", description: "What it does, features, getting started, usage", body: README },
      { name: "Decision record", description: "Context, drivers, options, decision, consequences", body: ADR },
      { name: "Design doc", description: "Overview, goals, proposed solution, operational concerns, asks for the author", body: DESIGN_DOC },
      { name: "Bug report", description: "Description, steps to reproduce, expected and actual behavior", body: BUG_REPORT },
      { name: "Pull request", description: "Description, type of change, checklist", body: PULL_REQUEST },
      { name: "Changelog", description: "Added, changed, fixed, newest release first", body: CHANGELOG },
    ],
  },
  FINANCE_PACK,
];

// The empty-note pills before the vault has templates of its own (or with no
// vault at all): a few built-ins used straight from memory, nothing written.
const STARTERS: [packId: string, name: string][] = [
  ["meetings", "Meeting notes"],
  ["writing", "Outline"],
  ["projects", "Project brief"],
  ["writing", "Book note"],
];

export const STARTER_TEMPLATES: TemplateEntry[] = STARTERS.map(([packId, name]) => {
  const pack = BUILTIN_PACKS.find((p) => p.id === packId)!;
  const template = pack.templates.find((t) => t.name === name)!;
  return { name, path: `builtin:${packId}/${name}`, pack: pack.name, body: template.body };
});

// Which of a pack's templates already exist in `_templates/<pack>/`
// (by file name, ignoring case), from the vault's indexed paths.
export function packTemplatesInVault(pack: BuiltinPack, templatesFolder: string, paths: string[]): Set<string> {
  const existing = new Set(paths.map((path) => path.toLowerCase()));
  return new Set(
    pack.templates
      .filter((template) => existing.has(`${templatesFolder}/${pack.name}/${template.name}.md`.toLowerCase()))
      .map((template) => template.name),
  );
}
