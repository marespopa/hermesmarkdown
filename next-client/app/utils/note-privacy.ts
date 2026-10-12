import { FM_REGEX, parseFmFields, updateFmFields } from "./frontmatter-utils";

// Private-note detection from YAML frontmatter only. Pure and worker-safe:
// no React, Jotai or DOM. Inline body #hashtags never count.
// One marker, two spellings: `private: true`, or `private` in `tags`.

/** The frontmatter key (`private: true`) and the `tags` entry that mark a note private. */
export const PRIVATE_MARKER = "private";

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

function isTrueFlag(flag: unknown): boolean {
  return flag === true || (typeof flag === "string" && normalizeToken(flag) === "true");
}

/** True when the frontmatter has `private: true` or a `private` tag. */
export function isSensitiveFrontmatter(frontmatter: Record<string, unknown> | undefined): boolean {
  if (!frontmatter) return false;
  if (isTrueFlag(frontmatter[PRIVATE_MARKER])) return true;
  return tagEntries(frontmatter.tags).some((tag) => normalizeToken(tag) === PRIVATE_MARKER);
}

/** Classifies raw note text (frontmatter included). Notes without frontmatter are never private. */
export function isSensitiveContent(content: string): boolean {
  return isSensitiveFrontmatter(parseFmFields(content));
}

/** Strips the private marker from the frontmatter: the `private` key and
 *  `private` entries in `tags` (dropping `tags` when nothing else is left).
 *  Other fields and the body are untouched. */
export function clearSensitiveMarkers(content: string): string {
  if (!FM_REGEX.test(content)) return content;
  const fields = parseFmFields(content);
  const edits: Record<string, string | null> = {};
  if (PRIVATE_MARKER in fields) edits[PRIVATE_MARKER] = null;
  const tags = tagEntries(fields.tags).map((tag) => tag.trim()).filter(Boolean);
  const kept = tags.filter((tag) => normalizeToken(tag) !== PRIVATE_MARKER);
  if (kept.length !== tags.length) edits.tags = kept.length > 0 ? kept.join(", ") : null;
  return Object.keys(edits).length > 0 ? updateFmFields(content, edits) : content;
}
