import { FM_REGEX, frontmatterList, parseFmFields, serializeField, updateFmFields } from "@/app/utils/frontmatter-utils";

// Suggest properties (the palette's Summarize / Structure menu): the AI reads
// the note and proposes a `title`, `description` and `tags`. Only keys the
// note doesn't have yet (or has empty) are filled; nothing else in the
// frontmatter changes, so the block stays the YAML the user wrote. The result
// is reviewed as a diff of the frontmatter block before it's applied.

export const SUGGEST_PROPERTIES_ID = "properties";
export const SUGGEST_PROPERTIES_LABEL = "Suggest properties";

export const PROPERTY_KEYS = ["title", "description", "tags"] as const;
export type PropertyKey = (typeof PROPERTY_KEYS)[number];

export interface SuggestedProperties {
  title?: string;
  description?: string;
  tags?: string[];
}

const BODY_CHAR_LIMIT = 4000;
const TAG_LIMIT = 5;

export const SUGGEST_PROPERTIES_SYSTEM =
  "You write frontmatter properties for a Markdown note. Read the note and return ONLY a JSON object, with no preamble, " +
  'code fence or explanation, holding just the requested keys: "title" (a short, descriptive title, no quotes or # marker), ' +
  '"description" (one plain sentence of at most 160 characters saying what the note is about) and "tags" ' +
  `(an array of 1 to ${TAG_LIMIT} lowercase tags, single words or hyphenated, no #). ` +
  "Prefer tags the vault already uses when they fit. Use only facts from the note.";

// The note's text after its frontmatter.
export function noteBody(doc: string): string {
  const match = FM_REGEX.exec(doc);
  return match ? doc.slice(match[0].length) : doc;
}

// The property keys the note is missing or has empty.
export function missingProperties(doc: string): PropertyKey[] {
  const fields = parseFmFields(doc);
  return PROPERTY_KEYS.filter((key) =>
    key === "tags" ? frontmatterList(fields.tags).length === 0 : !fields[key]?.trim().replace(/^['"]|['"]$/g, ""),
  );
}

export function buildSuggestPropertiesPrompt(doc: string, missing: PropertyKey[], vaultTags: string[]): string {
  const fields = parseFmFields(doc);
  const known = PROPERTY_KEYS.filter((key) => !missing.includes(key) && fields[key])
    .map((key) => `${key}: ${fields[key]}`);
  return [
    `SUGGEST THESE PROPERTIES: ${missing.join(", ")}`,
    known.length ? `PROPERTIES THE NOTE ALREADY HAS (for context):\n${known.join("\n")}` : "",
    vaultTags.length ? `TAGS ALREADY USED IN THE VAULT:\n${vaultTags.join(", ")}` : "",
    `NOTE:\n${noteBody(doc).slice(0, BODY_CHAR_LIMIT)}`,
  ].filter(Boolean).join("\n\n");
}

// One line, without characters that would end a double-quoted YAML value.
function cleanText(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").replace(/["\\]/g, "").trim() : "";
}

function cleanTag(value: unknown): string {
  return typeof value === "string"
    ? value.trim().replace(/^#/, "").toLowerCase().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}_/-]/gu, "")
    : "";
}

// The model's JSON reply, read leniently (a code fence or a stray sentence
// around the object is ignored). Null when there's no usable object.
export function parseSuggestedProperties(reply: string): SuggestedProperties | null {
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(reply.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const title = cleanText(data.title).replace(/^#+\s*/, "");
  const description = cleanText(data.description);
  const tagList = Array.isArray(data.tags) ? data.tags : typeof data.tags === "string" ? data.tags.split(",") : [];
  const tags = [...new Set(tagList.map(cleanTag).filter(Boolean))].slice(0, TAG_LIMIT);
  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(tags.length ? { tags } : {}),
  };
}

export interface PropertiesEdit {
  from: number;
  to: number;
  original: string;
  replacement: string;
}

// The frontmatter block before and after the suggested keys are added: the
// range of the block up to its closing `---` (or the very start of a note
// without one, where a new block goes). Null when nothing would change.
export function propertiesEdit(doc: string, missing: PropertyKey[], suggested: SuggestedProperties): PropertiesEdit | null {
  const edits: Record<string, string> = {};
  for (const key of missing) {
    const value = key === "tags" ? suggested.tags?.join(", ") : suggested[key];
    if (value) edits[key] = value;
  }
  if (Object.keys(edits).length === 0) return null;

  const match = FM_REGEX.exec(doc);
  if (!match) {
    const block = `---\n${Object.entries(edits).map(([key, value]) => serializeField(key, value)).join("\n")}\n---`;
    return { from: 0, to: 0, original: "", replacement: doc.length ? `${block}\n\n` : `${block}\n` };
  }
  const to = match[0].replace(/\r?\n$/, "").length;
  const original = doc.slice(0, to);
  return { from: 0, to, original, replacement: updateFmFields(original, edits).replace(/\n$/, "") };
}

// The vault's most used tags, for the model to reuse.
export function topVaultTags(tagLists: string[][], limit = 40): string[] {
  const counts = new Map<string, number>();
  for (const tags of tagLists) for (const tag of tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([tag]) => tag);
}
