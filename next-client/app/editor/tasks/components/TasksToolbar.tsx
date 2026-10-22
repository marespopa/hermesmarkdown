"use client";

import React from "react";
import { HiDotsHorizontal } from "react-icons/hi";
import type { TaskView } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import CountBadge from "@/app/components/CountBadge";
import TabContextMenu, { type TabContextMenuItem } from "@/app/editor/components/TabContextMenu";
import UnifiedSearchInput from "@/app/editor/components/UnifiedSearchInput";
import type { TaskSortDirection, TaskSortField } from "../task-sort";
import { TASK_VIEWS } from "../task-views";

export type TaskSort = `${TaskSortField}:${TaskSortDirection}`;
export type TaskGroupBy = "status" | "file";

// Each sort field and the direction it starts in when picked.
const SORT_FIELDS: { field: TaskSortField; label: string; direction: TaskSortDirection }[] = [
  { field: "dueDate", label: "Due Date", direction: "asc" },
  { field: "priority", label: "Priority", direction: "desc" },
  { field: "status", label: "Status", direction: "asc" },
  { field: "note", label: "Note", direction: "asc" },
  { field: "text", label: "Title", direction: "asc" },
];

export function taskListMenuItems(
  groupBy: TaskGroupBy,
  sort: TaskSort,
  onGroupByChange: (groupBy: TaskGroupBy) => void,
  onSortChange: (sort: TaskSort) => void,
): TabContextMenuItem[] {
  const [field, direction] = sort.split(":") as [TaskSortField, TaskSortDirection];
  return [
    { label: "Group by Status", checked: groupBy === "status", onClick: () => onGroupByChange("status") },
    { label: "Group by Note", checked: groupBy === "file", onClick: () => onGroupByChange("file") },
    ...SORT_FIELDS.map((option, i) => ({
      label: `Sort by ${option.label}`,
      checked: field === option.field,
      divider: i === 0,
      onClick: () => onSortChange(`${option.field}:${option.direction}`),
    })),
    { label: "Ascending", checked: direction === "asc", divider: true, onClick: () => onSortChange(`${field}:asc`) },
    { label: "Descending", checked: direction === "desc", onClick: () => onSortChange(`${field}:desc`) },
  ];
}

// The Tasks page's one toolbar: the title and count with the list menu (All
// only: grouping and sort), the Board · Now · Today · Upcoming · All switcher with
// each list's count, and one search field where `#` picks tag filters.
export default function TasksToolbar({
  view,
  counts,
  onViewChange,
  groupBy,
  onGroupByChange,
  sort,
  onSortChange,
  searchQuery,
  onSearchQueryChange,
  tagFilter,
  allTags,
  onTagAdd,
  onTagRemove,
}: {
  view: TaskView;
  counts: Record<TaskView, number>;
  onViewChange: (view: TaskView) => void;
  groupBy: TaskGroupBy;
  onGroupByChange: (groupBy: TaskGroupBy) => void;
  sort: TaskSort;
  onSortChange: (sort: TaskSort) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  tagFilter: string[];
  allTags: string[];
  onTagAdd: (tag: string) => void;
  onTagRemove: (tag: string) => void;
}) {
  const menuButtonRef = React.useRef<HTMLButtonElement>(null);
  const [menuAt, setMenuAt] = React.useState<{ x: number; y: number } | null>(null);
  const closeMenu = React.useCallback(() => setMenuAt(null), []);

  return (
    <div className="shrink-0 space-y-2.5 px-3 pt-3 pb-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2 className="text-ui-subhead font-semibold text-ink-light dark:text-ink-dark">Tasks</h2>
          <CountBadge count={counts.all} />
        </div>
        {view === "all" && (
          <Button
            ref={menuButtonRef}
            variant="unstyled"
            aria-label="Group and sort"
            aria-haspopup="menu"
            title="Group and sort"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setMenuAt(menuAt ? null : { x: Math.max(8, rect.right - 200), y: rect.bottom + 4 });
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-paper-softgray hover:text-ink-light dark:text-stone dark:hover:bg-paper-dark-surface dark:hover:text-ink-dark"
          >
            <HiDotsHorizontal size={16} />
          </Button>
        )}
      </div>

      <div
        role="tablist"
        aria-label="Task lists"
        className="grid grid-cols-5 rounded-lg bg-paper-softgray/70 p-0.5 dark:bg-paper-dark-surface/60"
      >
        {TASK_VIEWS.map(({ id, label }) => {
          const selected = view === id;
          return (
            <Button
              key={id}
              variant="segment"
              role="tab"
              aria-selected={selected}
              onClick={() => onViewChange(id)}
              // Five tabs share the row: less side padding than a segment's.
              className="!px-1"
            >
              <span className="truncate">{label}</span>
              <CountBadge count={counts[id]} />
            </Button>
          );
        })}
      </div>

      <UnifiedSearchInput
        tokens={tagFilter}
        text={searchQuery}
        allTags={allTags}
        onTokenAdd={onTagAdd}
        onTokenRemove={onTagRemove}
        onTextChange={onSearchQueryChange}
        placeholder="Search or #tag"
        ariaLabel="Filter tasks"
      />

      {menuAt && (
        <TabContextMenu
          x={menuAt.x}
          y={menuAt.y}
          label="Group and sort"
          anchorRef={menuButtonRef}
          items={taskListMenuItems(groupBy, sort, onGroupByChange, onSortChange)}
          onClose={closeMenu}
        />
      )}
    </div>
  );
}
