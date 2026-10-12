"use client";

import React from "react";
import { useAtom, useAtomValue } from "jotai";
import { HiOutlineCheckCircle } from "react-icons/hi";
import {
  atom_filteredTasks,
  atom_visibleTasks,
  atom_allTaskTags,
  atom_taskSearchQuery,
  atom_taskTagFilter,
  type DisplayTask,
} from "@/app/atoms/task-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_tasksGroupBy, atom_taskView, type TaskView } from "@/app/atoms/ui-atoms";
import { TaskItem } from "@/app/utils/taskExtractor";
import { useTaskWriteback } from "@/app/hooks/use-task-writeback";
import { TASK_STATUS_LABEL, type TaskStatus } from "@/app/utils/task-status";
import { sortTasks, type TaskSortDirection, type TaskSortField } from "../task-sort";
import { buildViewSections, localISODate, viewCounts } from "../task-views";
import TaskRow from "./TaskRow";
import TaskSection from "./TaskSection";
import TasksToolbar, { type TaskSort } from "./TasksToolbar";

interface TasksListProps {
  onFileSelect: (handle: FileSystemFileHandle, path: string, line: number) => void;
}

// All's status groups, in the order they're shown: what's under way first.
const GROUP_ORDER: TaskStatus[] = ["prog", "todo", "hold", "done", "cancelled"];

const EMPTY_VIEW: Record<TaskView, string> = {
  now: "Nothing in progress or up next",
  today: "Nothing due today",
  upcoming: "Nothing scheduled",
  all: "No tasks match the current filters",
};

export default function TasksList({ onFileSelect }: TasksListProps) {
  // Tasks from sensitive notes arrive masked, or are left out (and not
  // counted) in "hidden" Privacy Mode.
  const allTasks = useAtomValue(atom_visibleTasks);
  const tasks = useAtomValue(atom_filteredTasks);
  const allTags = useAtomValue(atom_allTaskTags);
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const { toggleTask, setTaskStatus } = useTaskWriteback();
  const [view, setView] = useAtom(atom_taskView);
  const [groupBy, setGroupBy] = useAtom(atom_tasksGroupBy);
  const [searchQuery, setSearchQuery] = useAtom(atom_taskSearchQuery);
  const [tagFilter, setTagFilter] = useAtom(atom_taskTagFilter);
  const [sort, setSort] = React.useState<TaskSort>("dueDate:asc");
  const [collapsed, setCollapsed] = React.useState<Record<TaskStatus, boolean>>({
    todo: false,
    prog: false,
    hold: false,
    done: true,
    cancelled: true,
  });
  const [collapsedFiles, setCollapsedFiles] = React.useState<Record<string, boolean>>({});
  const toggleCollapsed = (g: TaskStatus) => setCollapsed((prev) => ({ ...prev, [g]: !prev[g] }));
  const toggleCollapsedFile = (path: string) => setCollapsedFiles((prev) => ({ ...prev, [path]: !prev[path] }));

  const noteTitle = React.useCallback(
    (path: string) => {
      const meta = fileMetadata[path];
      return meta?.frontmatter?.title || meta?.name || path;
    },
    [fileMetadata],
  );

  // Read on every render (a string, so the memos below only rerun when the
  // day changes): a page left open past midnight catches up on its next render.
  const today = localISODate();
  const counts = React.useMemo(() => viewCounts(tasks, today, noteTitle), [tasks, today, noteTitle]);

  const smartSections = React.useMemo(
    () => (view === "all" ? [] : buildViewSections(view, tasks, today, noteTitle)),
    [view, tasks, today, noteTitle],
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

  const renderRow = (task: DisplayTask, subtitle?: string) => (
    <TaskRow
      key={task.id}
      task={task}
      subtitle={subtitle}
      onToggle={() => toggleTask(task)}
      onSetStatus={(status) => setTaskStatus(task, status)}
      onNavigate={() => handleNavigate(task)}
    />
  );

  const isEmpty = allTasks.length === 0;
  const viewIsEmpty = view === "all" ? tasks.length === 0 : smartSections.length === 0;

  return (
    <div className="flex flex-col h-full min-h-0 bg-paper-pale/40 dark:bg-paper-dark/30">
      <TasksToolbar
        view={view}
        counts={counts}
        onViewChange={setView}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        sort={sort}
        onSortChange={setSort}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        tagFilter={tagFilter}
        allTags={allTags}
        onTagAdd={(tag) => setTagFilter((prev) => (prev.includes(tag) ? prev : [...prev, tag]))}
        onTagRemove={(tag) => setTagFilter((prev) => prev.filter((t) => t !== tag))}
      />

      <div className="flex-1 overflow-y-auto space-y-4 px-2.5 pt-1 pb-3 custom-scrollbar">
        {isEmpty ? (
          <div className="px-3 py-6 text-ui-footnote italic opacity-40 text-center">
            <HiOutlineCheckCircle size={20} className="mx-auto mb-1 opacity-60" />
            No outstanding tasks
          </div>
        ) : viewIsEmpty ? (
          <div className="px-3 py-6 text-ui-footnote italic opacity-40 text-center">{EMPTY_VIEW[view]}</div>
        ) : view !== "all" ? (
          smartSections.map((section) => (
            <TaskSection
              key={section.id}
              title={section.title}
              count={section.tasks.length}
              status={section.status}
              overdue={section.overdue}
            >
              {section.tasks.map((task) => renderRow(task, noteTitle(task.path)))}
            </TaskSection>
          ))
        ) : groupBy === "status" ? (
          GROUP_ORDER.map((g) =>
            statusGroups[g].length === 0 ? null : (
              <TaskSection
                key={g}
                title={TASK_STATUS_LABEL[g]}
                count={statusGroups[g].length}
                status={g}
                collapsed={collapsed[g]}
                onToggle={() => toggleCollapsed(g)}
              >
                {statusGroups[g].map((task) => renderRow(task, noteTitle(task.path)))}
              </TaskSection>
            ),
          )
        ) : (
          fileGroups.map(([path, fileTasks]) => (
            <TaskSection
              key={path}
              title={noteTitle(path)}
              count={fileTasks.length}
              caps={false}
              collapsed={!!collapsedFiles[path]}
              onToggle={() => toggleCollapsedFile(path)}
            >
              {fileTasks.map((task) => renderRow(task))}
            </TaskSection>
          ))
        )}
      </div>
    </div>
  );
}
