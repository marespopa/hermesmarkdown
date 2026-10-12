"use client";

import { useState } from "react";
import { useAtom } from "jotai";
import { HiChevronDown } from "react-icons/hi";
import { atom_homeTasksCollapsed } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import { OPEN_TASK_DAYS, type FeedTask } from "./feed-model";

// How many tasks show before "+N more".
export const FEED_TASK_LIMIT = 8;
// The list's id, for its disclosure (aria-controls).
export const FEED_TASKS_ID = "feed-open-tasks";

interface FeedTasksProps {
  /** Open tasks from recent notes (`openFeedTasks`). */
  tasks: FeedTask[];
  /** Opens the task's note with the caret on its line (0-indexed). */
  onOpenTask: (path: string, line: number) => void;
}

// "Open tasks": the unchecked tasks of the last week's notes, under the
// greeting. A faint "5 open tasks" line folds them in and out (folded at
// first; the state is remembered across launches). Each task is an open circle and its text,
// with the note's title in faint type after it; it opens the note at its
// line. Nothing shows when there are none.
export default function FeedTasks({ tasks, onOpenTask }: FeedTasksProps) {
  const [collapsed, setCollapsed] = useAtom(atom_homeTasksCollapsed);
  const [showAll, setShowAll] = useState(false);
  if (tasks.length === 0) return null;
  const shown = showAll ? tasks : tasks.slice(0, FEED_TASK_LIMIT);
  const hidden = tasks.length - shown.length;

  return (
    <div className="mt-2">
      <Button
        variant="unstyled"
        aria-expanded={!collapsed}
        aria-controls={FEED_TASKS_ID}
        onClick={() => setCollapsed(!collapsed)}
        title={`Unchecked tasks from the last ${OPEN_TASK_DAYS} days`}
        className="inline-flex items-center gap-0.5 rounded text-ui-footnote text-fg-faint transition-colors hover:text-fg"
      >
        {tasks.length} open {tasks.length === 1 ? "task" : "tasks"}
        <HiChevronDown size={12} aria-hidden="true" className={`motion-safe:transition-transform ${collapsed ? "-rotate-90" : ""}`} />
      </Button>
      {!collapsed && (
        <section id={FEED_TASKS_ID} aria-label="Open tasks" className="mt-2">
          <ul className="flex flex-col">
            {shown.map((task) => (
              <li key={task.id}>
                <Button
                  variant="unstyled"
                  onClick={() => onOpenTask(task.path, task.line)}
                  aria-label={`${task.text || "Empty task"}, in ${task.noteTitle}`}
                  className="group/task -mx-2 flex w-[calc(100%+1rem)] min-w-0 items-baseline gap-2.5 rounded-lg px-2 py-1 text-left"
                >
                  <span
                    aria-hidden="true"
                    className="h-3 w-3 shrink-0 translate-y-px rounded-full border border-fg-faint transition-colors group-hover/task:border-sage group-focus-visible/task:border-sage"
                  />
                  <span className="min-w-0 truncate text-ui-subhead text-fg-muted transition-colors group-hover/task:text-fg group-focus-visible/task:text-fg">
                    {task.text || "Empty task"}
                    <span className="ml-2 text-ui-caption text-fg-faint">{task.noteTitle}</span>
                  </span>
                </Button>
              </li>
            ))}
          </ul>
          {(hidden > 0 || showAll) && tasks.length > FEED_TASK_LIMIT && (
            <Button
              variant="unstyled"
              aria-expanded={showAll}
              onClick={() => setShowAll((value) => !value)}
              className="ml-[1.375rem] mt-1 rounded text-ui-footnote text-fg-faint transition-colors hover:text-fg"
            >
              {showAll ? "Fewer" : `+${hidden} more`}
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
