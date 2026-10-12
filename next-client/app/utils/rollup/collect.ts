// Collects a period's task lines from its daily sheets into the three
// rollup lists. Pure and predictable: no AI, task lines only.

import { extractTasks } from "../taskExtractor";

export interface RollupItem {
  key: string; // dedup key: text lowercased, whitespace collapsed
  date: string; // "YYYY-MM-DD" of the day the item came from
  line: number; // 0-indexed line in that day's sheet
  text: string; // display text (tags and metadata stripped)
  tags: string[]; // custom tags, lowercase, in order
  inProgress: boolean;
  dueDate: string | null;
  /** The note the item links to, when it isn't the day's sheet (`date`). */
  source?: string;
}

// A task ticked off in the period somewhere other than the period's own
// daily sheets: a project note, or an earlier day's sheet. From the vault's
// index (its `@done()` stamp), so nothing extra is read from disk.
export interface DoneElsewhere {
  note: string; // the note's name, without .md, for the link
  doneDate: string; // "YYYY-MM-DD", inside the period
  line: number;
  text: string;
  tags: string[];
}

export interface CollectOptions {
  /** The period's first and last day ("YYYY-MM-DD"), to place `@done()` stamps. */
  range?: { first: string; last: string };
  doneElsewhere?: DoneElsewhere[];
}

export interface RollupData {
  sheetCount: number;
  done: RollupItem[];
  blocked: RollupItem[];
  open: RollupItem[];
}

export interface DoneGroup {
  tag: string | null; // null = "Other" (no custom tag)
  items: RollupItem[];
}

type State = "done" | "blocked" | "open";

export const rollupKey = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();

const byDateThenLine = (a: RollupItem, b: RollupItem) =>
  a.date < b.date ? -1 : a.date > b.date ? 1 : a.line - b.line;

// One entry per task text: the occurrence from the latest day wins (state,
// tags, link), and within a day the last one. Done = `[x]`; Blocked = on
// hold (`[!]`); to do and in progress are Still open; a cancelled task
// (`[-]`) is left out, and drops an earlier occurrence of itself too. With
// `range`, a task whose `@done()` stamp is after the period was still open
// in it. `doneElsewhere` adds tasks done in the period in other notes, dated
// by their stamp, unless the daily sheets already list the same text. Each
// list runs oldest first.
export function collectRollup(sheets: { date: string; text: string }[], { range, doneElsewhere = [] }: CollectOptions = {}): RollupData {
  const latest = new Map<string, { item: RollupItem; state: State }>();
  const ordered = [...sheets].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  for (const sheet of ordered) {
    for (const task of extractTasks(sheet.date, sheet.text)) {
      if (!task.text) continue;
      const key = rollupKey(task.text);
      if (task.status === "cancelled") {
        latest.delete(key);
        continue;
      }
      const doneLater = task.status === "done" && !!range && !!task.doneDate && task.doneDate > range.last;
      const state: State = task.status === "done" && !doneLater ? "done" : task.status === "hold" ? "blocked" : "open";
      latest.set(key, {
        state,
        item: {
          key,
          date: sheet.date,
          line: task.line,
          text: task.text,
          tags: task.tags,
          inProgress: task.status === "prog",
          dueDate: task.dueDate,
        },
      });
    }
  }
  for (const task of doneElsewhere) {
    const key = rollupKey(task.text);
    if (!task.text || latest.has(key)) continue;
    latest.set(key, {
      state: "done",
      item: { key, date: task.doneDate, line: task.line, text: task.text, tags: task.tags, inProgress: false, dueDate: null, source: task.note },
    });
  }
  const data: RollupData = { sheetCount: sheets.length, done: [], blocked: [], open: [] };
  for (const { item, state } of latest.values()) data[state].push(item);
  data.done.sort(byDateThenLine);
  data.blocked.sort(byDateThenLine);
  data.open.sort(byDateThenLine);
  return data;
}

// Done items grouped by their first custom tag, groups alphabetical, with
// untagged items last (tag null, shown as "Other"). Order inside a group is kept.
export function groupDone(items: RollupItem[]): DoneGroup[] {
  const groups = new Map<string | null, RollupItem[]>();
  for (const item of items) {
    const tag = item.tags[0] ?? null;
    groups.set(tag, [...(groups.get(tag) ?? []), item]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : a.localeCompare(b)))
    .map(([tag, groupItems]) => ({ tag, items: groupItems }));
}
