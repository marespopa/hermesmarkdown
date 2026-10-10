"use client";

import { useAtom } from "jotai";
import { HiChevronDown } from "react-icons/hi";
import { atom_homeTasksCollapsed } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import { FEED_TASKS_ID } from "./FeedTasks";
import { OPEN_TASK_DAYS, type FeedStats as Stats } from "./feed-model";

interface FeedStatsProps {
  stats: Stats;
  openTasks: number;
  /** The open tasks part folds the task list (`FeedTasks`) in and out. */
  tasksToggle?: boolean;
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

// One faint line under the weekday: "128 notes · 3 edited today · 5 open
// tasks". Parts at zero are left out; nothing shows for an empty feed. With
// `tasksToggle`, "5 open tasks" is the disclosure for the list below it
// (folded state remembered across launches), so the tasks need no header row
// of their own.
export default function FeedStats({ stats, openTasks, tasksToggle = false }: FeedStatsProps) {
  const [collapsed, setCollapsed] = useAtom(atom_homeTasksCollapsed);
  if (stats.notes === 0) return null;
  const parts = [
    plural(stats.notes, "note", "notes"),
    stats.editedToday > 0 && `${stats.editedToday} edited today`,
  ].filter(Boolean);
  const tasks = openTasks > 0 ? plural(openTasks, "open task", "open tasks") : null;

  return (
    <p className="mt-2 text-ui-footnote text-fg-faint">
      {parts.join(" · ")}
      {tasks && " · "}
      {tasks && tasksToggle ? (
        <Button
          variant="unstyled"
          aria-expanded={!collapsed}
          aria-controls={FEED_TASKS_ID}
          onClick={() => setCollapsed(!collapsed)}
          title={`Unchecked tasks from the last ${OPEN_TASK_DAYS} days`}
          className="inline-flex items-center gap-0.5 rounded text-fg-muted transition-colors hover:text-fg"
        >
          {tasks}
          <HiChevronDown size={12} aria-hidden="true" className={`motion-safe:transition-transform ${collapsed ? "-rotate-90" : ""}`} />
        </Button>
      ) : (
        tasks
      )}
    </p>
  );
}
