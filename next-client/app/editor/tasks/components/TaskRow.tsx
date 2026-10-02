"use client";

import React from "react";
import type { DisplayTask } from "@/app/atoms/task-atoms";
import Button from "@/app/components/Button";
import SensitiveBadge from "@/app/components/SensitiveBadge";

export function formatDueDate(dueDate: string, checked: boolean): { label: string; className: string } {
  const today = new Date().toISOString().slice(0, 10);
  if (checked) return { label: `Due: ${dueDate}`, className: "text-ink-muted dark:text-stone" };
  if (dueDate < today) return { label: `Overdue · ${dueDate}`, className: "text-red-600 dark:text-red-400" };
  if (dueDate === today) return { label: "Due: Today", className: "text-amber-600 dark:text-amber-400" };
  return { label: `Due: ${dueDate}`, className: "text-ink-muted dark:text-stone" };
}

function TaskCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <label className="relative flex h-7 w-7 -m-1.5 items-center justify-center shrink-0 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <div
        className={`w-4 h-4 rounded-[4px] border-2 transition-colors duration-150 flex items-center justify-center ${checked
            ? "bg-sage border-sage"
            : "bg-paper-light border-beige dark:bg-paper-dark-surface dark:border-clay hover:border-stone dark:hover:border-fg-faint"
          } peer-focus-visible:ring-2 peer-focus-visible:ring-sage/30`}
      >
        {checked && (
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
    </label>
  );
}

// One task on the Tasks page. A task from a sensitive note (isMasked) shows
// bullets and a lock instead of its text and tags; the checkbox, due date and
// file subtitle still work.
export default function TaskRow({
  task,
  subtitle,
  onToggle,
  onNavigate,
}: {
  task: DisplayTask;
  subtitle?: string;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const due = task.dueDate ? formatDueDate(task.dueDate, task.checked) : null;
  const tags = task.isMasked ? [] : task.tags;
  return (
    <div className="group flex items-start gap-2 rounded-lg border border-transparent px-2.5 py-2 transition-colors hover:border-beige/70 hover:bg-paper-light dark:hover:border-clay/50 dark:hover:bg-paper-dark-surface/70">
      <TaskCheckbox checked={task.checked} onChange={onToggle} />
      <Button variant="unstyled" className="min-w-0 flex-1 cursor-pointer text-left" onClick={onNavigate}>
        <div
          className={`flex min-w-0 items-center gap-1.5 text-ui-caption ${task.checked ? "line-through opacity-50" : "text-ink-light dark:text-ink-dark"
            }`}
        >
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
    </div>
  );
}
