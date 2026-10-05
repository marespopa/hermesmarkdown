// Raw body written by "New template…". Plain Markdown; never expanded on write.
// The frontmatter holds only YAML comments: other editors read it as an empty
// block, and splitTemplate drops it when the template is used.
export const TEMPLATE_STARTER = [
  "---",
  "# Add a field: type /field, or start typing {{date}} to see the list.",
  '# Optional, used by "New note from template…":',
  "# target_folder: notes",
  "# file_name: {{date}}-{{slug}}",
  "---",
  "# {{title}}",
  "",
  "Date: {{date}}",
  "Owner: {{prompt:Owner}}",
  "",
  "{{cursor}}",
  "",
].join("\n");
