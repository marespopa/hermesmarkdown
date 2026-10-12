"use client";

import React from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  HiOutlineCheckCircle,
  HiChevronRight,
  HiChevronDown,
  HiOutlineDocumentText,
  HiOutlineViewList,
  HiOutlineSearch,
  HiX,
} from "react-icons/hi";
import {
  atom_filteredTasks,
  atom_visibleTasks,
  atom_allTaskTags,
  atom_taskSearchQuery,
  atom_taskTagFilter,
  atom_taskDueFilter,
  TaskDueFilter,
  type DisplayTask,
} from "@/app/atoms/task-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_tasksGroupBy } from "@/app/atoms/ui-atoms";
import { TaskItem } from "@/app/utils/taskExtractor";
import { TASK_STATUS_LABEL, type TaskStatus } from "@/app/utils/task-status";
import { useTaskWriteback } from "@/app/hooks/use-task-writeback";
import { SelectControl } from "@/app/editor/settings/components/SettingControls";
import { sortTasks, type TaskSortDirection, type TaskSortField } from "../task-sort";
import Button from "@/app/components/Button";
import { BareInput } from "@/app/components/Input";
import TaskRow from "./TaskRow";
import { TaskStatusIcon } from "./TaskStatusButton";

interface TasksListProps {
  onFileSelect: (handle: FileSystemFileHandle, path: string, line: number) => void;
}

// Status groups, in the order they're shown: what's under way first.
const GROUP_ORDER: TaskStatus[] = ["prog", "todo", "hold", "done", "cancelled"];

const DUE_FILTER_OPTIONS: { value: TaskDueFilter; label: string }[] = [
  { value: "all", label: "All dates" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "none", label: "No due date" },
];

const SORT_OPTIONS: { value: `${TaskSortField}:${TaskSortDirection}`; label: string }[] = [
  { value: "dueDate:asc", label: "Due date · earliest first" },
  { value: "dueDate:desc", label: "Due date · latest first" },
  { value: "priority:desc", label: "Priority · high first" },
  { value: "priority:asc", label: "Priority · low first" },
  { value: "status:asc", label: "Status · to do first" },
  { value: "status:desc", label: "Status · done first" },
  { value: "note:asc", label: "Note · A–Z" },
  { value: "note:desc", label: "Note · Z–A" },
  { value: "text:asc", label: "Task · A–Z" },
  { value: "text:desc", label: "Task · Z–A" },
];

export default function TasksList({ onFileSelect }: TasksListProps) {
  // Tasks from sensitive notes arrive masked, or are left out (and not
  // counted) in "hidden" Privacy Mode.
  const allTasks = useAtomValue(atom_visibleTasks);
  const tasks = useAtomValue(atom_filteredTasks);
  const allTags = useAtomValue(atom_allTaskTags);
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const { toggleTask, setTaskStatus } = useTaskWriteback();
  const [groupBy, setGroupBy] = useAtom(atom_tasksGroupBy);
  const [searchQuery, setSearchQuery] = useAtom(atom_taskSearchQuery);
  const [tagFilter, setTagFilter] = useAtom(atom_taskTagFilter);
  const [dueFilter, setDueFilter] = useAtom(atom_taskDueFilter);
  const [sort, setSort] = React.useState<`${TaskSortField}:${TaskSortDirection}`>("dueDate:asc");
  const [collapsed, setCollapsed] = React.useState<Record<TaskStatus, boolean>>({
    todo: false,
    prog: false,
    hold: false,
    done: true,
    cancelled: true,
  });
  const [collapsedFiles, setCollapsedFiles] = React.useState<Record<string, boolean>>({});
  const toggleCollapsed = (g: TaskStatus) =>
    setCollapsed((prev) => ({ ...prev, [g]: !prev[g] }));
  const toggleCollapsedFile = (path: string) =>
    setCollapsedFiles((prev) => ({ ...prev, [path]: !prev[path] }));
  const toggleTagFilter = (tag: string) =>
    setTagFilter((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const hasActiveFilters = searchQuery.trim() !== "" || tagFilter.length > 0 || dueFilter !== "all";
  const clearFilters = () => {
    setSearchQuery("");
    setTagFilter([]);
    setDueFilter("all");
  };

  const noteTitle = React.useCallback(
    (path: string) => {
      const meta = fileMetadata[path];
      return meta?.frontmatter?.title || meta?.name || path;
    },
    [fileMetadata],
  );

  const statusGroups = React.useMemo(() => {
    const out: Record<TaskStatus, DisplayTask[]> = { todo: [], prog: [], hold: [], done: [], cancelled: [] };
    for (const t of tasks) out[t.status].push(t);
    const [field, direction] = sort.split(":") as [TaskSortField, TaskSortDirection];
    for (const [group, groupTasks] of Object.entries(out) as [TaskStatus, DisplayTask[]][]) {
      out[group] = sortTasks(groupTasks, field, direction, noteTitle);
    }
    return out;
  }, [tasks, noteTitle, sort]);

  const fileGroups = React.useMemo(() => {
    const byPath = new Map<string, DisplayTask[]>();
    for (const t of tasks) {
      const list = byPath.get(t.path);
      if (list) list.push(t);
      else byPath.set(t.path, [t]);
    }
    const [field, direction] = sort.split(":") as [TaskSortField, TaskSortDirection];
    return Array.from(byPath.entries())
      .map(([path, list]) => [path, sortTasks(list, field, direction, noteTitle)] as const)
      .sort(([a], [b]) => noteTitle(a).localeCompare(noteTitle(b)));
  }, [tasks, noteTitle, sort]);

  const handleNavigate = (task: TaskItem) => {
    const meta = fileMetadata[task.path];
    if (!meta?.handle) return;
    onFileSelect(meta.handle, task.path, task.line);
  };

  const isEmpty = allTasks.length === 0;
  const noMatches = !isEmpty && tasks.length === 0;

  return (
    <div className="flex flex-col h-full min-h-0 bg-paper-pale/40 dark:bg-paper-dark/30">
      <div className="shrink-0 border-b border-beige/70 px-3 pt-3 pb-2.5 dark:border-clay/40">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex min-w-0 items-baseline gap-2">
            <h2 className="text-ui-subhead font-semibold text-ink-light dark:text-ink-dark">Tasks</h2>
            <span className="text-ui-footnote tabular-nums text-ink-muted dark:text-stone">{allTasks.length}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center rounded-lg border border-beige/70 bg-paper-softgray/70 p-0.5 dark:border-clay/50 dark:bg-paper-dark-surface/60">
            <Button variant="unstyled"
              title="Group by status"
              aria-label="Group by status"
              aria-pressed={groupBy === "status"}
              onClick={() => setGroupBy("status")}
              className={`flex h-6 w-7 items-center justify-center rounded-md transition-colors ${groupBy === "status" ? "bg-paper-light text-sage shadow-sm dark:bg-paper-dark-surface dark:text-sage" : "text-ink-muted hover:text-ink-light dark:text-stone dark:hover:text-ink-dark"
                }`}
            >
              <HiOutlineViewList size={14} />
            </Button>
            <Button variant="unstyled"
              title="Group by file"
              aria-label="Group by file"
              aria-pressed={groupBy === "file"}
              onClick={() => setGroupBy("file")}
              className={`flex h-6 w-7 items-center justify-center rounded-md transition-colors ${groupBy === "file" ? "bg-paper-light text-sage shadow-sm dark:bg-paper-dark-surface dark:text-sage" : "text-ink-muted hover:text-ink-light dark:text-stone dark:hover:text-ink-dark"
                }`}
            >
              <HiOutlineDocumentText size={14} />
            </Button>
          </div>
          </div>
        </div>
        <div className="relative">
          <HiOutlineSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone pointer-events-none" />
          <BareInput
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter tasks..."
            className="h-8 w-full rounded-lg border border-beige/70 bg-paper-light pl-8 pr-2 text-ui-caption text-ink-light outline-none placeholder:text-fg-faint focus:border-sage/60 focus:ring-2 focus:ring-sage/15 dark:border-clay/50 dark:bg-paper-dark-surface dark:text-ink-dark"
          />
        </div>
      </div>

      <div className="shrink-0 border-b border-beige/70 px-3 py-2 dark:border-clay/40">
        <div className="flex items-center justify-between gap-2">
          <SelectControl value={dueFilter} onChange={(v) => setDueFilter(v as TaskDueFilter)} size="sm" fullWidth={false}>
            {DUE_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </SelectControl>
          <SelectControl value={sort} onChange={(value) => setSort(value as typeof sort)} size="sm" fullWidth={false} ariaLabel="Sort tasks">
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </SelectControl>
          {hasActiveFilters && (
          <Button variant="unstyled"
            onClick={clearFilters}
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-ui-footnote text-ink-muted transition-colors hover:bg-paper-softgray hover:text-ink-light dark:text-stone dark:hover:bg-paper-dark-surface dark:hover:text-ink-dark"
          >
            <HiX size={11} />
            Clear
          </Button>
          )}
        </div>
        {allTags.length > 0 && (
          <div className="mt-2 flex max-h-16 flex-wrap gap-1 overflow-y-auto custom-scrollbar">
            {allTags.map((tag) => (
              <Button variant="unstyled"
                key={tag}
                aria-pressed={tagFilter.includes(tag)}
                onClick={() => toggleTagFilter(tag)}
                className={`rounded-md border px-1.5 py-0.5 text-ui-footnote transition-colors ${
                  tagFilter.includes(tag)
                    ? "border-sage/60 bg-sage/15 text-sage"
                    : "border-beige/70 bg-transparent text-ink-muted hover:border-sage/60 hover:text-sage dark:border-clay/50 dark:text-stone"
                }`}
              >
                #{tag}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 px-2.5 pt-3 pb-3 custom-scrollbar">
        {isEmpty && (
          <div className="px-3 py-6 text-ui-footnote italic opacity-40 text-center">
            <HiOutlineCheckCircle size={20} className="mx-auto mb-1 opacity-60" />
            No outstanding tasks
          </div>
        )}
        {noMatches && (
          <div className="px-3 py-6 text-ui-footnote italic opacity-40 text-center">No tasks match the current filters</div>
        )}
        {!isEmpty && !noMatches && groupBy === "status" &&
          GROUP_ORDER.map((g) =>
            statusGroups[g].length === 0 ? null : (
              <div key={g}>
                <Button variant="unstyled"
                  onClick={() => toggleCollapsed(g)}
                  className="flex w-full items-center gap-1.5 px-2 pb-1.5 text-left text-ui-footnote font-semibold uppercase tracking-wide text-ink-muted transition-opacity hover:text-ink-light dark:text-stone dark:hover:text-ink-dark"
                >
                  {collapsed[g] ? <HiChevronRight size={12} /> : <HiChevronDown size={12} />}
                  <TaskStatusIcon status={g} size={11} />
                  {TASK_STATUS_LABEL[g]}
                  <span className="font-normal normal-case opacity-70">({statusGroups[g].length})</span>
                </Button>
                {!collapsed[g] && (
                  <div className="space-y-0.5">
                    {statusGroups[g].map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        subtitle={noteTitle(task.path)}
                        onToggle={() => toggleTask(task)}
                        onSetStatus={(status) => setTaskStatus(task, status)}
                        onNavigate={() => handleNavigate(task)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ),
          )}
        {!isEmpty && !noMatches && groupBy === "file" &&
          fileGroups.map(([path, fileTasks]) => (
            <div key={path}>
              <Button variant="unstyled"
                onClick={() => toggleCollapsedFile(path)}
                className="flex w-full items-center gap-1.5 px-2 pb-1.5 text-left text-ui-footnote font-semibold text-ink-muted hover:text-ink-light dark:text-stone dark:hover:text-ink-dark"
              >
                {collapsedFiles[path] ? <HiChevronRight size={12} /> : <HiChevronDown size={12} />}
                <span className="truncate">{noteTitle(path)}</span>
                <span className="font-normal opacity-70 shrink-0">({fileTasks.length})</span>
              </Button>
              {!collapsedFiles[path] && (
                <div className="space-y-0.5">
                  {fileTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={() => toggleTask(task)}
                      onSetStatus={(status) => setTaskStatus(task, status)}
                      onNavigate={() => handleNavigate(task)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
