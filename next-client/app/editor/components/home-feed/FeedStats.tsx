"use client";

import type { FeedStats as Stats } from "./feed-model";

interface FeedStatsProps {
  stats: Stats;
  openTasks: number;
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

// One faint line under the weekday: "128 notes · 3 edited today · 5 open
// tasks". Parts at zero are left out; nothing shows for an empty feed.
export default function FeedStats({ stats, openTasks }: FeedStatsProps) {
  if (stats.notes === 0) return null;
  const parts = [
    plural(stats.notes, "note", "notes"),
    stats.editedToday > 0 && `${stats.editedToday} edited today`,
    openTasks > 0 && plural(openTasks, "open task", "open tasks"),
  ].filter(Boolean);
  return <p className="mt-2 text-ui-footnote text-fg-faint">{parts.join(" · ")}</p>;
}
