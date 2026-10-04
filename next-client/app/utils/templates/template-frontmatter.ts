import { FM_REGEX, parseFmFields, updateFmFields } from "@/app/utils/frontmatter-utils";

// Routing keys a template's frontmatter may carry. They place notes created
// by "New note from template…" and never reach the created note.
export interface TemplateRouting {
  targetFolder?: string;
  fileName?: string;
}

const ROUTING_KEYS = { target_folder: null, file_name: null } as const;

const stripQuotes = (value: string) => value.trim().replace(/^(['"])(.*)\1$/, "$2").trim();
const dropLeadingBlankLines = (text: string) => text.replace(/^(?:[ \t]*\r?\n)+/, "");

// Splits a raw template into its routing values (taken before any token
// expansion) and the content without the routing keys. If removing them
// leaves the frontmatter block empty, the block is dropped.
export function splitTemplate(raw: string): { routing: TemplateRouting; content: string } {
  const match = FM_REGEX.exec(raw);
  if (!match) return { routing: {}, content: raw };

  const fields = parseFmFields(raw);
  const routing: TemplateRouting = {};
  if (fields.target_folder !== undefined && stripQuotes(fields.target_folder)) {
    routing.targetFolder = stripQuotes(fields.target_folder);
  }
  if (fields.file_name !== undefined && stripQuotes(fields.file_name)) {
    routing.fileName = stripQuotes(fields.file_name);
  }
  if (!("target_folder" in fields) && !("file_name" in fields)) return { routing, content: raw };

  const updated = updateFmFields(raw, { ...ROUTING_KEYS });
  const block = FM_REGEX.exec(updated);
  if (block && !block[1].trim()) {
    return { routing, content: dropLeadingBlankLines(updated.slice(block[0].length)) };
  }
  return { routing, content: updated };
}

// The content after the frontmatter block (the whole text when there is none).
export function templateBody(content: string): string {
  const match = FM_REGEX.exec(content);
  return match ? dropLeadingBlankLines(content.slice(match[0].length)) : content;
}
