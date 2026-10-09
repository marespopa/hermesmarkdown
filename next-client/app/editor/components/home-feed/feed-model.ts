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
  /** Frontmatter tags and inline #hashtags; empty for sensitive notes, whose tags may say more than their title. */
  tags: string[];
  /**
   * Today's worklog sheet (`withTodaySheet`): "existing" leads the day,
   * "missing" is the row that starts it (not a note yet).
   */
  todaySheet?: "existing" | "missing";
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
// With `tagFilter`, only notes carrying every one of those tags are kept,
// before day labels are assigned.
export function buildFeed(
  metadata: Record<string, FileMetadata>,
  displayItems: Map<string, NoteDisplayItem>,
  now: Date,
  templatesFolder?: string,
  pinnedPaths: readonly string[] = [],
  tagFilter: readonly string[] = [],
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

  const toEntry = (entry: FileMetadata, isPinned: boolean): FeedEntry => {
    const item = displayItems.get(entry.path)!;
    return {
      path: entry.path,
      title: item.title,
      fileName: item.isSensitive ? null : entry.path.split("/").pop()!,
      preview: item.preview,
      modifiedAt: entry.modifiedAt || 0,
      dayLabel: null,
      isPinned,
      isIndexed: item.isIndexed,
      isSensitive: item.isSensitive,
      previewStyle: item.previewStyle,
      tags: item.isSensitive ? [] : entry.tags ?? [],
    };
  };

  const entries = [
    ...pinned.map((entry) => toEntry(entry, true)),
    ...sorted.map((entry) => toEntry(entry, false)),
  ];
  const kept = tagFilter.length
    ? entries.filter((entry) => tagFilter.every((tag) => entry.tags.includes(tag)))
    : entries;
  return labelDays(kept, now);
}

// Today's sheet leads the unpinned notes, so it heads "Today": the note
// itself, marked, or, when there's none yet, a "missing" row in its place
// that starts it. `today.exists` without the note in the feed (hidden by
// Privacy Mode) adds nothing; nor does a pinned sheet, which stays pinned.
export function withTodaySheet(
  feed: FeedEntry[],
  today: { path: string; exists: boolean },
  now: Date,
): FeedEntry[] {
  const index = feed.findIndex((entry) => entry.path === today.path);
  if (index >= 0 && feed[index].isPinned) return feed;
  if (index < 0 && today.exists) return feed;
  const sheet: FeedEntry = index >= 0
    ? { ...feed[index], todaySheet: "existing" }
    : {
        path: today.path,
        title: "Start today's sheet",
        fileName: today.path.split("/").pop()!,
        preview: "",
        modifiedAt: now.getTime(),
        dayLabel: null,
        isPinned: false,
        isIndexed: true,
        isSensitive: false,
        previewStyle: "plain",
        tags: [],
        todaySheet: "missing",
      };
  const rest = feed.filter((entry) => entry.path !== today.path);
  const firstUnpinned = rest.findIndex((entry) => !entry.isPinned);
  const at = firstUnpinned < 0 ? rest.length : firstUnpinned;
  return labelDays([...rest.slice(0, at), sheet, ...rest.slice(at)], now);
}

// "Pinned" on the first pinned note, then a day label on the first note of
// each day; undated notes get none.
function labelDays(entries: FeedEntry[], now: Date): FeedEntry[] {
  let previousDay: number | null = null;
  let pinnedLabeled = false;
  return entries.map((entry) => {
    let label: string | null = null;
    if (entry.isPinned) {
      if (!pinnedLabeled) label = "Pinned";
      pinnedLabeled = true;
    } else if (entry.modifiedAt > 0) {
      const day = startOfDay(new Date(entry.modifiedAt));
      if (day !== previousDay) label = dayLabel(entry.modifiedAt, now);
      previousDay = day;
    }
    return { ...entry, dayLabel: label };
  });
}

export interface FeedTag {
  tag: string;
  /** How many feed notes carry it. */
  count: number;
}

// Every tag in the feed, most used first; ties go to the tag used most
// recently, then alphabetically. Takes the built feed, so notes the privacy
// level hides or marks sensitive never contribute.
export function feedTags(feed: FeedEntry[]): FeedTag[] {
  const stats = new Map<string, { count: number; latest: number }>();
  for (const entry of feed) {
    for (const tag of entry.tags) {
      const stat = stats.get(tag) ?? { count: 0, latest: 0 };
      stat.count++;
      stat.latest = Math.max(stat.latest, entry.modifiedAt);
      stats.set(tag, stat);
    }
  }
  return [...stats]
    .sort(([a, x], [b, y]) => y.count - x.count || y.latest - x.latest || a.localeCompare(b))
    .map(([tag, { count }]) => ({ tag, count }));
}

// How far back the open-tasks rollup looks, in days (today included).
export const OPEN_TASK_DAYS = 7;

export interface FeedTask {
  /** `${path}#${line}`, from the task extractor. */
  id: string;
  path: string;
  /** 0-indexed line of the task in its note. */
  line: number;
  text: string;
  /** The note's title, as the feed shows it. */
  noteTitle: string;
}

// Unchecked `- [ ]` tasks from the feed's notes edited in the last
// `OPEN_TASK_DAYS` days, newest note first, then in note order. Takes the
// built feed, so templates, hidden files and notes the privacy level hides
// never contribute; sensitive notes don't either, since a task may say more
// than the title.
export function openFeedTasks(
  feed: FeedEntry[],
  metadata: Record<string, FileMetadata>,
  now: Date,
  days = OPEN_TASK_DAYS,
): FeedTask[] {
  const since = startOfDay(now) - (days - 1) * DAY_MS;
  return feed
    .filter((entry) => !entry.isSensitive && entry.modifiedAt >= since)
    .sort((a, b) => b.modifiedAt - a.modifiedAt || a.path.localeCompare(b.path))
    .flatMap((entry) => (metadata[entry.path]?.tasks ?? [])
      .filter((task) => !task.checked)
      .sort((a, b) => a.line - b.line)
      .map((task) => ({ id: task.id, path: entry.path, line: task.line, text: task.text, noteTitle: entry.title })));
}

export interface FeedStats {
  notes: number;
  /** Notes modified since local midnight. */
  editedToday: number;
}

export function feedStats(feed: FeedEntry[], now: Date): FeedStats {
  const today = startOfDay(now);
  return { notes: feed.length, editedToday: feed.filter((entry) => entry.modifiedAt >= today).length };
}
