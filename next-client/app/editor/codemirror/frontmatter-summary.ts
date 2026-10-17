import { parseFmFields } from "@/app/utils/frontmatter-utils";

// The frontmatter's collapsed-row summary (frontmatter-fold.ts): which values
// and key names the "▸ Properties" row shows, and its accessible label.

// Top-level keys of a frontmatter block, in order (`title`, `tags`, …). Read
// with the shared frontmatter parser, so the summary row always lists
// the same keys as other readers.
export function frontmatterKeys(doc: string): string[] {
  return Object.keys(parseFmFields(doc));
}

const SUMMARY_KEY_LIMIT = 3;

// "title, tags, created, +2": the first few keys, then a count of the rest.
export function frontmatterSummary(keys: string[]): string {
  const shown = keys.slice(0, SUMMARY_KEY_LIMIT).join(", ");
  const rest = keys.length - SUMMARY_KEY_LIMIT;
  return rest > 0 ? `${shown}, +${rest}` : shown;
}

const SUMMARY_TAG_LIMIT = 3;

export interface FrontmatterRowSummary {
  title: string | null;
  status: string | null;
  // The first few tags, without `#`, then a count of the rest.
  tags: string[];
  moreTags: number;
  // The other keys, as `frontmatterSummary` lists them.
  keys: string;
}

function unquote(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, "").trim();
}

// What the collapsed row shows: `title` as its value (the note's name, not
// the word "title"), `status` and `tags` as values (chips), the remaining
// keys by name. A key shown by value isn't named again; an empty `title`,
// `status` or `tags` stays a plain key.
export function frontmatterRowSummary(doc: string): FrontmatterRowSummary {
  const fields = parseFmFields(doc);
  const title = "title" in fields ? unquote(fields.title) || null : null;
  const status = "status" in fields ? unquote(fields.status) || null : null;
  const allTags = (fields.tags ?? "")
    .split(",")
    .map((tag) => unquote(tag).replace(/^#/, ""))
    .filter(Boolean);
  const keys = Object.keys(fields).filter(
    (key) => !(key === "title" && title) && !(key === "status" && status) && !(key === "tags" && allTags.length > 0),
  );
  return {
    title,
    status,
    tags: allTags.slice(0, SUMMARY_TAG_LIMIT),
    moreTags: Math.max(0, allTags.length - SUMMARY_TAG_LIMIT),
    keys: frontmatterSummary(keys),
  };
}

// The row as one line of text, for its accessible label:
// "Release plan, draft, #work, #ideas, +1, created".
export function frontmatterRowLabel(summary: FrontmatterRowSummary): string {
  return [
    summary.title,
    summary.status,
    ...summary.tags.map((tag) => `#${tag}`),
    summary.moreTags > 0 ? `+${summary.moreTags}` : null,
    summary.keys || null,
  ].filter(Boolean).join(", ");
}
