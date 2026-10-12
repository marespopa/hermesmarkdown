"use client";

import React from "react";
import { HiDotsHorizontal } from "react-icons/hi";
import type { DisplayTask } from "@/app/atoms/task-atoms";
import Button from "@/app/components/Button";
import SensitiveBadge from "@/app/components/SensitiveBadge";
import { isOpenStatus, type TaskStatus } from "@/app/utils/task-status";
import TaskStatusButton from "./TaskStatusButton";

// `closed`: the task is done or cancelled, so its date no longer warns.
export function formatDueDate(dueDate: string, closed: boolean): { label: string; className: string } {
  const today = new Date().toISOString().slice(0, 10);
  if (closed) return { label: `Due: ${dueDate}`, className: "text-ink-muted dark:text-stone" };
  if (dueDate < today) return { label: `Overdue · ${dueDate}`, className: "text-red-600 dark:text-red-400" };
  if (dueDate === today) return { label: "Due: Today", className: "text-amber-600 dark:text-amber-400" };
  return { label: `Due: ${dueDate}`, className: "text-ink-muted dark:text-stone" };
}

const TEXT_CLASS: Record<TaskStatus, string> = {
  todo: "text-ink-light dark:text-ink-dark",
  prog: "text-ink-light dark:text-ink-dark",
  hold: "text-ink-light dark:text-ink-dark",
  done: "line-through opacity-50",
  cancelled: "line-through text-fg-faint opacity-60",
};

// One task on the Tasks page. A task from a sensitive note (isMasked) shows
// bullets and a lock instead of its text and tags; the status ring, due date
// and file subtitle still work.
export default function TaskRow({
  task,
  subtitle,
  onToggle,
  onSetStatus,
  onNavigate,
}: {
  task: DisplayTask;
  subtitle?: string;
  onToggle: () => void;
  onSetStatus: (status: TaskStatus) => void;
  onNavigate: () => void;
}) {
  const [menuAt, setMenuAt] = React.useState<{ x: number; y: number } | null>(null);
  const closeMenu = React.useCallback(() => setMenuAt(null), []);
  const menuButtonRef = React.useRef<HTMLButtonElement>(null);
  const due = task.dueDate ? formatDueDate(task.dueDate, !isOpenStatus(task.status)) : null;
  const tags = task.isMasked ? [] : task.tags;
  return (
    <div className="group flex items-start gap-2.5 rounded-xl px-2.5 py-2 transition-colors hover:bg-paper-light dark:hover:bg-paper-dark-surface/70 [@media(pointer:coarse)]:py-2.5">
      <TaskStatusButton
        status={task.status}
        onToggle={onToggle}
        onSetStatus={onSetStatus}
        menuAt={menuAt}
        menuAnchorRef={menuButtonRef}
        onMenuClose={closeMenu}
      />
      <Button variant="unstyled" className="min-w-0 flex-1 cursor-pointer text-left" onClick={onNavigate}>
        <div className={`flex min-w-0 items-center gap-1.5 text-ui-caption ${TEXT_CLASS[task.status]}`}>
          {task.isMasked ? (
            <>
              <span aria-hidden="true" className="truncate">{task.text}</span>
              <span className="sr-only">Sensitive task</span>
              <SensitiveBadge />
            </>
          ) : (
            <span className="truncate">{task.text || "(empty task)"}</span>
          )}
        </div>
        {(subtitle || due || tags.length > 0) && (
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5">
            {subtitle && <span className="text-ui-footnote text-ink-muted dark:text-stone truncate">{subtitle}</span>}
            {due && <span className={`text-ui-footnote shrink-0 ${due.className}`}>{due.label}</span>}
            {tags.map((tag) => (
              <span key={tag} className="text-ui-footnote text-sage shrink-0">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </Button>
      <Button
        ref={menuButtonRef}
        variant="unstyled"
        aria-label="Change status"
        aria-haspopup="menu"
        title="Change status"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMenuAt(menuAt ? null : { x: rect.left, y: rect.bottom + 4 });
        }}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-fg-faint opacity-0 transition-opacity hover:bg-paper-softgray hover:text-ink-light focus-visible:opacity-100 group-hover:opacity-100 dark:hover:bg-paper-dark-surface dark:hover:text-ink-dark [@media(pointer:coarse)]:opacity-100"
      >
        <HiDotsHorizontal size={14} />
      </Button>
    </div>
  );
}
