import { parseFmFields } from "@/app/utils/frontmatter-utils";
import { TEMPLATE_TOKENS } from "./template-tokens";

// Non-blocking checks for a template's text (the AI chat's save card shows
// them). Each warning is one short sentence.

const MISSPELLED_ROUTING_KEYS: Record<string, string> = {
  "target-folder": "target_folder",
  targetfolder: "target_folder",
  targetFolder: "target_folder",
  "file-name": "file_name",
  filename: "file_name",
  fileName: "file_name",
};

export function lintTemplate(raw: string): string[] {
  const warnings: string[] = [];
  const known = new Set<string>(TEMPLATE_TOKENS);
  const unknown = new Set<string>();
  let cursors = 0;
  let emptyPrompt = false;
  for (const match of raw.matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)) {
    const token = match[1];
    if (token.startsWith("prompt:")) {
      if (!token.slice("prompt:".length).trim()) emptyPrompt = true;
    } else if (token === "cursor") {
      cursors++;
    } else if (!known.has(token)) {
      unknown.add(token);
    }
  }
  if (unknown.size > 0) {
    warnings.push(`Unknown token${unknown.size > 1 ? "s" : ""} ${[...unknown].map((t) => `{{${t}}}`).join(", ")} will stay as typed.`);
  }
  if (emptyPrompt) warnings.push("A {{prompt:}} has no label.");
  if (cursors > 1) warnings.push("Only the first {{cursor}} sets the caret; the others are removed.");
  for (const key of Object.keys(parseFmFields(raw))) {
    const intended = MISSPELLED_ROUTING_KEYS[key];
    if (intended) warnings.push(`Frontmatter key "${key}" looks like "${intended}".`);
  }
  return warnings;
}

const TOKEN_DESCRIPTIONS: Record<(typeof TEMPLATE_TOKENS)[number], string> = {
  date: "today, YYYY-MM-DD",
  time: "now, HH:mm (24 h)",
  weekday: "weekday name, e.g. Sunday",
  year: "four-digit year",
  month: "month number, 01-12",
  day: "day of the month, 01-31",
  monthName: "month name, e.g. October",
  title: "the new note's title",
  slug: "the title in URL-safe kebab-case",
  clipboard: "the clipboard text",
  cursor: "where the caret goes after the note opens (removed from the text)",
};

// Markdown description of the template grammar, built from TEMPLATE_TOKENS so
// it can't drift from the engine. The AI chat's template skill embeds it.
export const TEMPLATE_SYNTAX_GUIDE = [
  "HermesMarkdown templates are plain Markdown files. Tokens are written {{name}} and are expanded when the template is used:",
  ...TEMPLATE_TOKENS.map((token) => `- {{${token}}}: ${TOKEN_DESCRIPTIONS[token]}`),
  "- {{prompt:Label}}: asks the user for a value labelled Label; every occurrence of the same label gets the same answer.",
  "No other tokens exist: no scripting, conditionals or loops. Unknown tokens stay as typed.",
  "Optional frontmatter keys (used only by \"New note from template…\", removed from the created note):",
  "- target_folder: vault-relative folder for the new note, e.g. rfcs",
  "- file_name: the new note's file name without .md; tokens allowed, e.g. rfc-{{date}}-{{slug}}",
  "Other frontmatter keys are copied into the note, with tokens expanded.",
].join("\n");
