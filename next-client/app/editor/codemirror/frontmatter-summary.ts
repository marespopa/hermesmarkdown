import { parseFmFields } from "@/app/utils/frontmatter-utils";

// The frontmatter's collapsed-row summary (frontmatter-fold.ts): which values
// the "▸ Properties" row shows, and its accessible label.

const SUMMARY_TAG_LIMIT = 3;

export interface FrontmatterRowSummary {
  title: string | null;
  // The first few tags, without `#`, then a count of the rest.
  tags: string[];
  moreTags: number;
}

function unquote(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, "").trim();
}

// What the collapsed row shows: only the `title` (the note's name, not the
// word "title") and the `tags` (chips). Every other key stays hidden until
// the block is expanded.
export function frontmatterRowSummary(doc: string): FrontmatterRowSummary {
  const fields = parseFmFields(doc);
  const title = "title" in fields ? unquote(fields.title) || null : null;
  const allTags = (fields.tags ?? "")
    .split(",")
    .map((tag) => unquote(tag).replace(/^#/, ""))
    .filter(Boolean);
  return {
    title,
    tags: allTags.slice(0, SUMMARY_TAG_LIMIT),
    moreTags: Math.max(0, allTags.length - SUMMARY_TAG_LIMIT),
  };
}

// The row as one line of text, for its accessible label:
// "Release plan, #work, #ideas, +1".
export function frontmatterRowLabel(summary: FrontmatterRowSummary): string {
  return [
    summary.title,
    ...summary.tags.map((tag) => `#${tag}`),
    summary.moreTags > 0 ? `+${summary.moreTags}` : null,
  ].filter(Boolean).join(", ");
}
