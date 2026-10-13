import { parseFmFields } from "@/app/utils/frontmatter-utils";
import { TEMPLATE_TOKENS, isBlankToken, isValidToken, parseTemplateToken } from "./template-tokens";

// Non-blocking checks for a template's text (the template strip and AI
// chat's save card show them). Each warning is one short, plain sentence.

// Keys templates once used to place and name new notes; they're kept out of
// created notes now (template-frontmatter.ts).
const RETIRED_KEYS = new Set(["target_folder", "file_name"]);

// One edit apart (insert, delete or replace a character), or a case
// difference: a likely typo of a known token.
function isNearMiss(word: string, token: string): boolean {
  const a = word.toLowerCase();
  const b = token.toLowerCase();
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 3 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const tail = (x: string, skip: number) => x.slice(i + skip);
  return tail(a, 1) === tail(b, 1) || tail(a, 1) === tail(b, 0) || tail(a, 0) === tail(b, 1);
}

export function lintTemplate(raw: string): string[] {
  const warnings: string[] = [];
  const typos = new Map<string, string>();
  const misused = new Set<string>();
  const invalid = new Set<string>();
  let cursors = 0;
  let emptyPrompt = false;
  for (const match of raw.matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)) {
    const token = match[1];
    if (token.startsWith("prompt:")) {
      if (!token.slice("prompt:".length).trim()) emptyPrompt = true;
    } else if (token === "cursor") {
      cursors++;
    } else if (isValidToken(token)) {
      // fine
    } else if (isBlankToken(token)) {
      const intended = TEMPLATE_TOKENS.find((known) => isNearMiss(token, known));
      if (intended) typos.set(token, intended);
    } else if (parseTemplateToken(token)) {
      misused.add(token);
    } else {
      invalid.add(token);
    }
  }
  for (const [token, intended] of typos) {
    warnings.push(`{{${token}}} looks like {{${intended}}}; as typed, it's a blank to fill in.`);
  }
  for (const token of misused) {
    warnings.push(`{{${token}}}: only {{date}} takes math like +1d, and only {{date}} and {{time}} take a format.`);
  }
  if (invalid.size > 0) {
    const list = [...invalid].map((t) => `{{${t}}}`).join(", ");
    warnings.push(`${list} ${invalid.size > 1 ? "aren't fields" : "isn't a field"}, so it'll be copied as typed.`);
  }
  if (emptyPrompt) warnings.push("A question field ({{prompt:}}) has no question.");
  if (cursors > 1) warnings.push("\"Start typing here\" ({{cursor}}) appears more than once; only the first counts.");
  for (const key of Object.keys(parseFmFields(raw))) {
    if (RETIRED_KEYS.has(key)) warnings.push(`"${key}" is no longer used: a template only gives a note its text. You can delete it.`);
  }
  return warnings;
}

export const TOKEN_DESCRIPTIONS: Record<(typeof TEMPLATE_TOKENS)[number], string> = {
  date: "today, YYYY-MM-DD",
  time: "now, HH:mm (24 h)",
  title: "the new note's title",
  clipboard: "the clipboard text",
  selection: "the text selected when the template is inserted (empty for new notes)",
  cursor: "where the caret goes after the note opens (removed from the text)",
};

// Markdown description of the template grammar, built from TEMPLATE_TOKENS so
// it can't drift from the engine. The AI chat's template skill embeds it.
export const TEMPLATE_SYNTAX_GUIDE = [
  "HermesMarkdown templates are plain Markdown files. Tokens are written {{name}} and are expanded when the template is used:",
  ...TEMPLATE_TOKENS.map((token) => `- {{${token}}}: ${TOKEN_DESCRIPTIONS[token]}`),
  "- {{prompt:Label}}: asks the user for a value labelled Label; every occurrence of the same label gets the same answer.",
  "- {{date:FORMAT}} formats the date: YYYY YY MMMM MMM MM M dddd ddd DD D HH H mm ss, ww (ISO week, 01-53), GGGG (the ISO week's year), Q (quarter, 1-4), [literal text]. E.g. {{date:dddd, D MMMM}}, {{date:GGGG-[W]ww}} (this week's name, 2026-W42), {{date:YYYY-MM}} (this month's), {{date:YYYY-[Q]Q}} (this quarter's). {{time:HH:mm}} takes a format too.",
  "- {{date+1d}} / {{date-2w}} / {{date+1m}} / {{date+1y}}: date math (days, weeks, months, years); combine with a format: {{date+1d:dddd}}, or {{date-1w:GGGG-[W]ww}} for last week's name.",
  "- Any other {{name}} (letters, digits, underscores), e.g. {{task_1}}, stays in the created note as a blank to fill in; Tab jumps between blanks.",
  "No scripting, conditionals or loops.",
  "Frontmatter keys are copied into the note, with tokens expanded. A template never decides a note's name or folder.",
].join("\n");
