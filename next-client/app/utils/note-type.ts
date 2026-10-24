// A note's document type: the frontmatter's `type:` value, else a
// `type/<name>` tag (`#type/project`), lowercased; null without one.
// The start of plan 002's shared reader (type, status, dates).
export function noteTypeOf(meta: { frontmatter?: Record<string, unknown>; tags?: string[] } | undefined): string | null {
  if (!meta) return null;
  const value = meta.frontmatter?.type;
  if (typeof value === "string" && value.trim()) return value.trim().toLowerCase();
  const tag = meta.tags?.find((t) => t.toLowerCase().startsWith("type/"));
  return tag ? tag.slice("type/".length).toLowerCase() || null : null;
}
