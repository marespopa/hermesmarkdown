import { FM_REGEX, parseFmFields, updateFmFields } from "./frontmatter-utils";

// Sensitive-note detection from YAML frontmatter only. Pure and worker-safe:
// no React, Jotai or DOM. Inline body #hashtags never count.

/** Frontmatter `tags` entries that mark a note sensitive. */
export const SENSITIVE_TAGS: readonly string[] = ["sensitive", "private"];

function normalizeToken(value: string): string {
  return value
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim()
    .replace(/^#/, "")
    .toLowerCase();
}

function tagEntries(tags: unknown): string[] {
  if (typeof tags === "string") return tags.split(",");
  if (Array.isArray(tags)) {
    return tags.flatMap((tag) => (typeof tag === "string" ? tag.split(",") : []));
  }
  return [];
}

/** Frontmatter keys whose `true` value marks a note sensitive. */
export const SENSITIVE_FLAGS: readonly string[] = ["sensitive", "private"];

function isTrueFlag(flag: unknown): boolean {
  return flag === true || (typeof flag === "string" && normalizeToken(flag) === "true");
}

/** True when `sensitive: true`, `private: true` or a `sensitive` / `private` tag is present. Any positive marker wins. */
export function isSensitiveFrontmatter(frontmatter: Record<string, unknown> | undefined): boolean {
  if (!frontmatter) return false;
  if (SENSITIVE_FLAGS.some((key) => isTrueFlag(frontmatter[key]))) return true;
  return tagEntries(frontmatter.tags).some((tag) => SENSITIVE_TAGS.includes(normalizeToken(tag)));
}

/** Classifies raw note text (frontmatter included). Notes without frontmatter are never sensitive. */
export function isSensitiveContent(content: string): boolean {
  return isSensitiveFrontmatter(parseFmFields(content));
}

/** Strips every sensitive marker from the frontmatter: the `sensitive` /
 *  `private` keys, and `sensitive` / `private` entries in `tags` (dropping
 *  `tags` when nothing else is left). Other fields and the body are untouched. */
export function clearSensitiveMarkers(content: string): string {
  if (!FM_REGEX.test(content)) return content;
  const fields = parseFmFields(content);
  const edits: Record<string, string | null> = {};
  for (const key of SENSITIVE_FLAGS) {
    if (key in fields) edits[key] = null;
  }
  const tags = tagEntries(fields.tags).map((tag) => tag.trim()).filter(Boolean);
  const kept = tags.filter((tag) => !SENSITIVE_TAGS.includes(normalizeToken(tag)));
  if (kept.length !== tags.length) edits.tags = kept.length > 0 ? kept.join(", ") : null;
  return Object.keys(edits).length > 0 ? updateFmFields(content, edits) : content;
}
