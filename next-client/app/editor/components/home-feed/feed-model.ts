import type { FileMetadata } from "@/app/atoms/metadata";

// Pure model behind the home feed: which notes appear, their order, titles,
// and the day labels in the left gutter.

export interface FeedEntry {
  path: string;
  title: string;
  preview: string;
  modifiedAt: number;
  /** Gutter label, set only on the first note of each day; null otherwise and while undated. */
  dayLabel: string | null;
  /** False until the indexer has parsed the note (no preview yet; it may already have a date). */
  isIndexed: boolean;
}

// Vault notes only: no dotfolders (.hermes/, .obsidian/), no _-prefixed
// meta files or folders, and nothing but Markdown.
export function isFeedPath(path: string): boolean {
  if (!path.toLowerCase().endsWith(".md")) return false;
  return !path.split("/").some((segment) => segment.startsWith(".") || segment.startsWith("_"));
}

export function feedTitle(metadata: Pick<FileMetadata, "name" | "frontmatter">): string {
  const title = metadata.frontmatter?.title;
  if (typeof title === "string" && title.trim()) return title.trim();
  return metadata.name.replace(/\.md$/i, "");
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

const DAY_MS = 24 * 60 * 60 * 1000;

// "Today", "Yesterday", the weekday for the five days before that, then a
// short date (with the year once it's a different year).
export function dayLabel(modifiedAt: number, now: Date): string {
  const date = new Date(modifiedAt);
  const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
  if (daysAgo <= 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  if (daysAgo < 7) return date.toLocaleDateString(undefined, { weekday: "short" });
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}

// Indexing first stats every note (modified time only), then parses them
// newest first. A note with a date but no preview yet sorts into place and
// gets its day label, with a placeholder preview. A note with no date at all
// (modifiedAt 0: not stat'ed yet, or unreadable) sorts after the dated ones,
// alphabetically, with no label.
export function buildFeed(metadata: Record<string, FileMetadata>, now: Date): FeedEntry[] {
  const sorted = Object.values(metadata)
    .filter((entry) => isFeedPath(entry.path))
    .sort((a, b) => (b.modifiedAt || 0) - (a.modifiedAt || 0) || a.path.localeCompare(b.path));

  let previousDay: number | null = null;
  return sorted.map((entry) => {
    const modifiedAt = entry.modifiedAt || 0;
    let label: string | null = null;
    if (modifiedAt > 0) {
      const day = startOfDay(new Date(modifiedAt));
      if (day !== previousDay) label = dayLabel(modifiedAt, now);
      previousDay = day;
    }
    return {
      path: entry.path,
      title: feedTitle(entry),
      preview: entry.preview ?? "",
      modifiedAt,
      dayLabel: label,
      isIndexed: entry.preview !== undefined,
    };
  });
}
