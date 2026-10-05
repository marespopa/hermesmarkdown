// Raw bodies "New template…" offers to start from. Plain Markdown; never
// expanded on write. Frontmatter `#` lines are YAML comments: hints for the
// author that splitTemplate drops when the template is used. Other keys
// (author, status, …) are copied into created notes with tokens expanded.

export interface TemplateStarter {
  /** Shown in the picker. */
  name: string;
  /** Prefilled in the name prompt. */
  suggestedName: string;
  description: string;
  body: string;
}

const HINT = "# Add a field: type /field, or start typing {{date}} to see the list.";

const frontmatter = (targetFolder: string, fileName: string, fields: string[]) => [
  "---",
  HINT,
  '# Optional, used by "New note from template…":',
  `# target_folder: ${targetFolder}`,
  `# file_name: ${fileName}`,
  ...fields,
  "---",
];

// The default starter: one example of each kind of field, nothing else.
export const TEMPLATE_STARTER = [
  ...frontmatter("notes", "{{date}}-{{slug}}", []),
  "# {{title}}",
  "",
  "Date: {{date}}",
  "Owner: {{prompt:Owner}}",
  "",
  "{{cursor}}",
  "",
].join("\n");

const MEETING_NOTES = [
  ...frontmatter("meetings", "{{date}}-{{slug}}", ["date: {{date}}", "attendees: {{prompt:Attendees}}"]),
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
  ...frontmatter("specs", "{{slug}}", ["author: {{prompt:Author}}", "status: Draft", "version: 0.1", "date: {{date}}"]),
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
  ...frontmatter("reports", "{{date}}-{{slug}}", ["author: {{prompt:Author}}", "date: {{date}}"]),
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

export const TEMPLATE_STARTERS: TemplateStarter[] = [
  { name: "Basic", suggestedName: "", description: "Title, date, one prompt", body: TEMPLATE_STARTER },
  { name: "Meeting notes", suggestedName: "Meeting notes", description: "Agenda, decisions, action items", body: MEETING_NOTES },
  { name: "Spec", suggestedName: "Spec", description: "Author, status, summary, design", body: SPEC },
  { name: "Report", suggestedName: "Report", description: "Summary, findings, next steps", body: REPORT },
];
