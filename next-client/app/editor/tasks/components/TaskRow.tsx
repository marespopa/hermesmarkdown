"use client";

import React from "react";
import { HiDotsHorizontal, HiOutlineDocumentText } from "react-icons/hi";
import type { DisplayTask } from "@/app/atoms/task-atoms";
import Button from "@/app/components/Button";
import PrivateBadge from "@/app/components/PrivateBadge";
import TagPill from "@/app/components/TagPill";
import { isOpenStatus, type TaskStatus } from "@/app/utils/task-status";
import TaskStatusButton from "./TaskStatusButton";
import { useTaskSwipe } from "./use-task-swipe";
import { localISODate, workDateLabel } from "../task-views";

// `closed`: the task is done or cancelled, so its date no longer warns.
export function formatDueDate(dueDate: string, closed: boolean): { label: string; className: string } {
  const today = localISODate();
  if (closed) return { label: `Due: ${dueDate}`, className: "text-ink-muted dark:text-stone" };
  if (dueDate < today) return { label: `Overdue · ${dueDate}`, className: "text-red-600 dark:text-red-400" };
  if (dueDate === today) return { label: "Due: Today", className: "text-amber-600 dark:text-amber-400" };
  return { label: `Due: ${dueDate}`, className: "text-ink-muted dark:text-stone" };
}

// The color behind a row being swiped, by the status the swipe leads to.
const SWIPE_BG: Record<TaskStatus, string> = {
  todo: "bg-[var(--fg-faint)]",
  prog: "bg-task-prog",
  hold: "bg-task-hold",
  done: "bg-task-done",
  cancelled: "bg-[var(--fg-faint)]",
};

const TEXT_CLASS: Record<TaskStatus, string> = {
  todo: "text-ink-light dark:text-ink-dark",
  prog: "text-ink-light dark:text-ink-dark",
  hold: "text-ink-light dark:text-ink-dark",
  done: "line-through opacity-50",
  cancelled: "line-through text-fg-faint opacity-60",
};

// One task on the Tasks page. A task from a private note (isMasked) shows
// bullets and a lock instead of its text and tags; the status ring, due date
// and file subtitle still work. On touch, the row swipes (use-task-swipe.ts):
// right to move the task forward, left to set it aside. Its note opens from
// a click on the text, a double-click anywhere on the row, or Open Note in
// the status menu (⋯ or right-click on the ring).
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
  const workDate = workDateLabel(task, localISODate());
  const tags = task.isMasked ? [] : task.tags;
  const swipe = useTaskSwipe(task.status, onSetStatus);
  const swiping = swipe.offset !== 0;
  const openItems = [{ label: "Open File", icon: <HiOutlineDocumentText size={14} />, onClick: onNavigate }];
  return (
    <div className="relative overflow-hidden rounded-xl touch-pan-y" {...swipe.handlers}>
      {swipe.action && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 flex items-center px-4 text-ui-footnote font-semibold text-white transition-opacity ${SWIPE_BG[swipe.action.status]} ${swipe.offset > 0 ? "justify-start" : "justify-end"} ${swipe.armed ? "opacity-100" : "opacity-60"}`}
        >
          <span className={`transition-transform duration-150 ${swipe.armed ? "scale-110" : "scale-100"}`}>{swipe.action.label}</span>
        </div>
      )}
      <div
        style={swiping ? { transform: `translateX(${swipe.offset}px)` } : undefined}
        onDoubleClick={(e) => {
          // The ring and ⋯ handle their own clicks; the text already opened the note.
          if ((e.target as HTMLElement).closest("button")) return;
          onNavigate();
        }}
        className={`group relative flex items-start gap-2.5 rounded-xl px-2.5 py-2 [@media(pointer:coarse)]:py-2.5 ${
          swiping
            ? "bg-paper-pale dark:bg-paper-dark"
            : "transition-[transform,background-color] duration-300 ease-spring hover:bg-paper-light dark:hover:bg-paper-dark-surface/70"
        }`}
      >
        <TaskStatusButton
          status={task.status}
          onToggle={onToggle}
          onSetStatus={onSetStatus}
          menuAt={menuAt}
          menuAnchorRef={menuButtonRef}
          onMenuClose={closeMenu}
          extraItems={openItems}
        />
        <Button variant="unstyled" className="min-w-0 flex-1 cursor-pointer text-left" onClick={onNavigate}>
          <div className={`flex min-w-0 items-center gap-1.5 text-ui-caption ${TEXT_CLASS[task.status]}`}>
            {task.isMasked ? (
              <>
                <span aria-hidden="true" className="truncate">{task.text}</span>
                <span className="sr-only">Private task</span>
                <PrivateBadge />
              </>
            ) : (
              <span className="truncate">{task.text || "(empty task)"}</span>
            )}
          </div>
          {(subtitle || due || workDate || tags.length > 0) && (
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5 text-ui-footnote">
              {subtitle && <span className="text-ui-footnote text-ink-muted dark:text-stone truncate">{subtitle}</span>}
              {due && <span className={`text-ui-footnote shrink-0 ${due.className}`}>{due.label}</span>}
              {workDate && <span className="text-ui-footnote shrink-0 text-ink-muted dark:text-stone">{workDate}</span>}
              {tags.map((tag) => (
                <TagPill key={tag} tag={tag} className="shrink-0" />
              ))}
            </div>
          )}
        </Button>
        <Button
          ref={menuButtonRef}
          variant="icon-small"
          aria-label="Change status"
          aria-haspopup="menu"
          title="Change status"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setMenuAt(menuAt ? null : { x: rect.left, y: rect.bottom + 4 });
          }}
          className="text-fg-faint opacity-0 focus-visible:opacity-100 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100"
        >
          <HiDotsHorizontal size={14} />
        </Button>
      </div>
    </div>
  );
}
