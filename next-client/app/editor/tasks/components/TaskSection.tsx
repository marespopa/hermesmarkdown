"use client";

import React from "react";
import { HiChevronDown, HiChevronRight } from "react-icons/hi";
import Button from "@/app/components/Button";
import CountBadge from "@/app/components/CountBadge";
import type { TaskStatus } from "@/app/utils/task-status";
import { TaskStatusIcon } from "./TaskStatusButton";

// A titled run of task rows on the Tasks page: a small-caps caption (with a
// status ring and the count) over its rows. Collapsible when `onToggle` is
// given (All's groups); the smart lists' sections always stay open. Note
// titles (grouped by note) pass `caps={false}` to keep their own casing.
export default function TaskSection({
  title,
  count,
  status,
  overdue,
  caps = true,
  collapsed = false,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  status?: TaskStatus;
  overdue?: boolean;
  caps?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}) {
  const caption = (
    <>
      {status && <TaskStatusIcon status={status} size={11} />}
      <span className={`truncate ${overdue ? "text-red-600 dark:text-red-400" : ""}`}>{title}</span>
      <CountBadge count={count} />
    </>
  );
  const captionClass =
    `flex w-full items-center gap-1.5 px-2.5 pb-1 text-left text-ui-footnote font-semibold text-ink-muted dark:text-stone ${caps ? "uppercase tracking-wide" : ""}`;

  return (
    <section aria-label={title}>
      {onToggle ? (
        <Button
          variant="unstyled"
          aria-expanded={!collapsed}
          onClick={onToggle}
          className={`${captionClass} transition-colors hover:text-ink-light dark:hover:text-ink-dark`}
        >
          {collapsed ? <HiChevronRight size={12} className="shrink-0" /> : <HiChevronDown size={12} className="shrink-0" />}
          {caption}
        </Button>
      ) : (
        <h3 className={captionClass}>{caption}</h3>
      )}
      {!collapsed && <div className="space-y-0.5">{children}</div>}
    </section>
  );
}
