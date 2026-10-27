import { FM_REGEX, parseFmFields, updateFmFields } from "@/app/utils/frontmatter-utils";

// Keys templates once used to place and name new notes (`target_folder`,
// `file_name`). They no longer do anything and are kept out of created
// notes; the linter flags them.
const RETIRED_KEYS = { target_folder: null, file_name: null } as const;

const dropLeadingBlankLines = (text: string) => text.replace(/^(?:[ \t]*\r?\n)+/, "");

// Frontmatter with its column-0 `#` comment lines removed. Indented `#` lines
// may belong to a block scalar and are kept. `empty` when nothing but blank
// lines is left.
function stripFmComments(raw: string, match: RegExpExecArray): { cleaned: string; empty: boolean } {
  const lines = match[1].split(/\r?\n/);
  const kept = lines.filter((line) => !line.startsWith("#"));
  if (kept.length === lines.length) return { cleaned: raw, empty: false };
  const rest = raw.slice(match[0].length);
  if (!kept.join("").trim()) return { cleaned: dropLeadingBlankLines(rest), empty: true };
  const eol = match[0].includes("\r\n") ? "\r\n" : "\n";
  return { cleaned: `---${eol}${kept.join(eol)}${eol}---${eol}${rest}`, empty: false };
}

// A raw template's content: frontmatter comments and retired keys removed.
// If that leaves the frontmatter block empty, the block is dropped.
export function templateContent(raw: string, { dropKeys = [] }: { dropKeys?: string[] } = {}): string {
  const match = FM_REGEX.exec(raw);
  if (!match) return raw;
  const stripped = stripFmComments(raw, match);
  if (stripped.empty) return stripped.cleaned;
  const fields = parseFmFields(stripped.cleaned);
  const removed: Record<string, null> = { ...RETIRED_KEYS, ...Object.fromEntries(dropKeys.map((k) => [k, null])) };
  if (!Object.keys(removed).some((key) => key in fields)) return stripped.cleaned;
  const updated = updateFmFields(stripped.cleaned, removed);
  const block = FM_REGEX.exec(updated);
  return block && !block[1].trim() ? dropLeadingBlankLines(updated.slice(block[0].length)) : updated;
}

// The content after the frontmatter block (the whole text when there is none).
export function templateBody(content: string): string {
  const match = FM_REGEX.exec(content);
  return match ? dropLeadingBlankLines(content.slice(match[0].length)) : content;
}
