"use client";

import { useState } from "react";
import { useAtom } from "jotai";
import { HiChevronRight } from "react-icons/hi";
import { atom_homeTasksCollapsed } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import { OPEN_TASK_DAYS, type FeedTask } from "./feed-model";

// How many tasks show before "+N more".
export const FEED_TASK_LIMIT = 8;

interface FeedTasksProps {
  /** Open tasks from recent notes (`openFeedTasks`). */
  tasks: FeedTask[];
  /** Opens the task's note with the caret on its line (0-indexed). */
  onOpenTask: (path: string, line: number) => void;
}

// "Open tasks": the unchecked tasks of the last week's notes, in a section
// that folds (remembered across launches). Each task opens its note at its
// line. Hidden when there are none.
export default function FeedTasks({ tasks, onOpenTask }: FeedTasksProps) {
  const [collapsed, setCollapsed] = useAtom(atom_homeTasksCollapsed);
  const [showAll, setShowAll] = useState(false);
  if (tasks.length === 0) return null;
  const shown = showAll ? tasks : tasks.slice(0, FEED_TASK_LIMIT);
  const hidden = tasks.length - shown.length;

  return (
    <section aria-label="Open tasks" className="grid grid-cols-[4.5rem_1fr] gap-3 sm:grid-cols-[5rem_1fr]">
      <span className="pt-2 text-right text-ui-footnote text-fg-muted">Tasks</span>
      <div className="min-w-0">
        <Button
          variant="unstyled"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(!collapsed)}
          title={`Unchecked tasks from the last ${OPEN_TASK_DAYS} days`}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-ui-footnote text-fg-muted transition-colors hover:text-fg"
        >
          <HiChevronRight size={14} aria-hidden="true" className={`motion-safe:transition-transform ${collapsed ? "" : "rotate-90"}`} />
          {tasks.length} open
        </Button>
        {!collapsed && (
          <ul className="flex flex-col">
            {shown.map((task) => (
              <li key={task.id}>
                <Button
                  variant="unstyled"
                  onClick={() => onOpenTask(task.path, task.line)}
                  aria-label={`${task.text || "Empty task"}, in ${task.noteTitle}`}
                  className="flex w-full min-w-0 items-baseline gap-2.5 rounded-md px-3 py-1.5 text-left transition-colors hover:bg-surface-raised"
                >
                  <span aria-hidden="true" className="h-3 w-3 shrink-0 translate-y-0.5 rounded-sm border border-fg-faint" />
                  <span className="min-w-0 flex-1 truncate text-ui-subhead text-fg">{task.text || "Empty task"}</span>
                  <span className="max-w-[40%] shrink-0 truncate text-ui-caption text-fg-faint">{task.noteTitle}</span>
                </Button>
              </li>
            ))}
            {(hidden > 0 || showAll) && tasks.length > FEED_TASK_LIMIT && (
              <li>
                <Button
                  variant="unstyled"
                  aria-expanded={showAll}
                  onClick={() => setShowAll((value) => !value)}
                  className="rounded-md px-3 py-1.5 text-ui-footnote text-fg-muted transition-colors hover:text-fg"
                >
                  {showAll ? "Fewer" : `+${hidden} more`}
                </Button>
              </li>
            )}
          </ul>
        )}
      </div>
    </section>
  );
}
