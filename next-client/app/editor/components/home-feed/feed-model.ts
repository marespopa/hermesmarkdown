import type { FileMetadata } from "@/app/atoms/metadata";
import { noteDisplayTitle, type NoteDisplayItem, type PreviewStyle } from "@/app/utils/note-display";
import { isTemplatePath } from "@/app/utils/templates/template-registry";

// Pure model behind the home feed: which notes appear, their order, titles,
// and the labels in the left gutter (days, and "Pinned").

export interface FeedEntry {
  path: string;
  title: string;
  /**
   * The file's name, extension included ("2026-09-28.md"); null for
   * sensitive notes, whose file name may say more than their title.
   */
  fileName: string | null;
  preview: string;
  modifiedAt: number;
  /**
   * Gutter label, set only on the first note of each day ("Pinned" on the
   * first pinned note); null otherwise and while undated.
   */
  dayLabel: string | null;
  /** Pinned to the top of the feed. */
  isPinned: boolean;
  /** False until the indexer has parsed the note (no preview yet; it may already have a date). */
  isIndexed: boolean;
  /** Marked sensitive in frontmatter (shows a lock). */
  isSensitive: boolean;
  /** How the preview renders: as is, masked bullets, or blurred until hover / focus. */
  previewStyle: PreviewStyle;
}

// Vault notes only: no dotfolders (.hermes/, .obsidian/), no _-prefixed
// meta files or folders, and nothing but Markdown.
export function isFeedPath(path: string): boolean {
  if (!path.toLowerCase().endsWith(".md")) return false;
  return !path.split("/").some((segment) => segment.startsWith(".") || segment.startsWith("_"));
}

// A non-sensitive note's title; the display factory owns the logic.
export function feedTitle(metadata: Pick<FileMetadata, "name" | "frontmatter">): string {
  return noteDisplayTitle(metadata, false);
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

const DAY_MS = 24 * 60 * 60 * 1000;

// "Today", "Yesterday", the full weekday for the five days before that, then a
// short date (with the year once it's a different year).
export function dayLabel(modifiedAt: number, now: Date): string {
  const date = new Date(modifiedAt);
  const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
  if (daysAgo <= 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  if (daysAgo < 7) return date.toLocaleDateString(undefined, { weekday: "long" });
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
// alphabetically, with no label. Title and preview come from the display
// items (the privacy level's view); notes missing from them are left out
// before day labels are assigned, so no label is orphaned. Template files
// (direct children of `templatesFolder`) are left out too. Pinned notes
// (`pinnedPaths`, newest pin first) come first, under one "Pinned" label,
// and leave their day; pins to notes not in the feed are skipped.
export function buildFeed(
  metadata: Record<string, FileMetadata>,
  displayItems: Map<string, NoteDisplayItem>,
  now: Date,
  templatesFolder?: string,
  pinnedPaths: readonly string[] = [],
): FeedEntry[] {
  const notes = new Map(
    Object.values(metadata)
      .filter((entry) =>
        isFeedPath(entry.path) &&
        displayItems.has(entry.path) &&
        !(templatesFolder && isTemplatePath(entry.path, templatesFolder)))
      .map((entry) => [entry.path, entry]),
  );
  const pinnedSet = new Set(pinnedPaths);
  const pinned = [...pinnedSet].flatMap((path) => notes.get(path) ?? []);
  const sorted = [...notes.values()]
    .filter((entry) => !pinnedSet.has(entry.path))
    .sort((a, b) => (b.modifiedAt || 0) - (a.modifiedAt || 0) || a.path.localeCompare(b.path));

  const toEntry = (entry: FileMetadata, label: string | null, isPinned: boolean): FeedEntry => {
    const item = displayItems.get(entry.path)!;
    return {
      path: entry.path,
      title: item.title,
      fileName: item.isSensitive ? null : entry.path.split("/").pop()!,
      preview: item.preview,
      modifiedAt: entry.modifiedAt || 0,
      dayLabel: label,
      isPinned,
      isIndexed: item.isIndexed,
      isSensitive: item.isSensitive,
      previewStyle: item.previewStyle,
    };
  };

  let previousDay: number | null = null;
  return [
    ...pinned.map((entry, index) => toEntry(entry, index === 0 ? "Pinned" : null, true)),
    ...sorted.map((entry) => {
      const modifiedAt = entry.modifiedAt || 0;
      let label: string | null = null;
      if (modifiedAt > 0) {
        const day = startOfDay(new Date(modifiedAt));
        if (day !== previousDay) label = dayLabel(modifiedAt, now);
        previousDay = day;
      }
      return toEntry(entry, label, false);
    }),
  ];
}

export interface WeekDay {
  /** Local midnight of the day. */
  day: number;
  /** How many feed notes were modified that day. */
  count: number;
  /** Index of the day's first (newest) row in the feed, or -1 when it has none. */
  firstIndex: number;
}

// The week strip: the seven days ending today, oldest first, each with its
// note count and the feed row to jump to (its first unpinned note, or a
// pinned one when that's all the day has). Takes the built feed, so notes the
// privacy level hides are never counted.
export function buildWeek(feed: FeedEntry[], now: Date): WeekDay[] {
  const days: WeekDay[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    // Calendar arithmetic, not 24h steps, so DST changes don't skip a day.
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset).getTime();
    days.push({ day, count: 0, firstIndex: -1 });
  }
  const byDay = new Map(days.map((entry) => [entry.day, entry]));
  feed.forEach((entry, index) => {
    if (entry.modifiedAt <= 0) return;
    const day = byDay.get(startOfDay(new Date(entry.modifiedAt)));
    if (!day) return;
    day.count++;
    if (day.firstIndex === -1 || (feed[day.firstIndex].isPinned && !entry.isPinned)) day.firstIndex = index;
  });
  return days;
}
