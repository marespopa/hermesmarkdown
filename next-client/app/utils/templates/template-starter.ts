// Raw bodies "New template…" offers to start from. Plain Markdown; never
// expanded on write. No hints or commented-out settings: the template strip
// explains fields and picks the folder. Frontmatter keys (author, status, …)
// are copied into created notes with fields filled in.

export interface TemplateStarter {
  /** Shown in the picker. */
  name: string;
  /** Prefilled in the name prompt. */
  suggestedName: string;
  description: string;
  body: string;
  /** A few lines to insert into a note, not a page to start one from. */
  snippet?: boolean;
}

const frontmatter = (fields: string[]) => (fields.length ? ["---", ...fields, "---"] : []);

// The default starter: one example of each kind of field, nothing else.
export const TEMPLATE_STARTER = [
  ...frontmatter([]),
  "# {{title}}",
  "",
  "Date: {{date}}",
  "Owner: {{prompt:Owner}}",
  "",
  "{{cursor}}",
  "",
].join("\n");

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

// One timestamped line, inserted with /template wherever you are (for
// example at the end of today's sheet): a log entry, not a page.
const LOG_ENTRY = "- {{time}} {{cursor}}\n";

export const TEMPLATE_STARTERS: TemplateStarter[] = [
  { name: "Basic", suggestedName: "", description: "Title, date, one prompt", body: TEMPLATE_STARTER },
  { name: "Journal", suggestedName: "Journal", description: "Today's date, free writing, grateful for", body: JOURNAL },
  { name: "Log entry", suggestedName: "Log entry", description: "One line starting with the time, for your daily sheet", body: LOG_ENTRY, snippet: true },
  { name: "Meeting notes", suggestedName: "Meeting notes", description: "Agenda, decisions, action items", body: MEETING_NOTES },
  { name: "Spec", suggestedName: "Spec", description: "Author, status, summary, design", body: SPEC },
  { name: "Report", suggestedName: "Report", description: "Summary, findings, next steps", body: REPORT },
];
