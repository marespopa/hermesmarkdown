"use client";

import React from "react";
import { useAtom, useAtomValue } from "jotai";
import toast from "react-hot-toast";
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
import { atom_vaultHandle, resolveFileHandleAtPath } from "@/app/atoms/vault-atoms";
import { TaskItem } from "@/app/utils/taskExtractor";
import { useTaskWriteback } from "@/app/hooks/use-task-writeback";
import { showUndoToast } from "@/app/hooks/file-system/undo-toast";
import { TASK_STATUS_LABEL, toggledStatus, type TaskStatus } from "@/app/utils/task-status";
import { sortTasks, type TaskSortDirection, type TaskSortField } from "../task-sort";
import { buildBoardColumns, buildViewSections, localISODate, viewCounts, type TaskSectionData } from "../task-views";
import TaskBoard from "./TaskBoard";
import TaskRow from "./TaskRow";
import TaskSection from "./TaskSection";
import TasksToolbar, { type TaskSort } from "./TasksToolbar";
import { useTaskLinger } from "./use-task-linger";

interface TasksListProps {
  onFileSelect: (handle: FileSystemFileHandle, path: string, line: number) => void;
}

// All's status groups, in the order they're shown: what's under way first.
const GROUP_ORDER: TaskStatus[] = ["prog", "todo", "hold", "done", "cancelled"];

// What the Undo toast says was done.
const STATUS_VERB: Record<TaskStatus, string> = {
  todo: "Reopened",
  prog: "Started",
  hold: "Put on hold",
  done: "Completed",
  cancelled: "Cancelled",
};

const quoted = (text: string) => `“${text.length > 40 ? `${text.slice(0, 39).trimEnd()}…` : text}”`;

// One section on screen, whichever list or grouping made it. `collapse`
// names which collapsed-state map folds it (All's groups only).
interface ListGroup extends TaskSectionData<DisplayTask> {
  caps?: boolean;
  collapse?: "status" | "file";
  /** Rows show their note's title (not when grouped by note). */
  subtitles: boolean;
}

const EMPTY_VIEW: Record<TaskView, string> = {
  now: "Nothing in progress or up next",
  today: "Nothing due today",
  upcoming: "Nothing scheduled",
  all: "No tasks match the current filters",
  board: "No tasks match the current filters",
};

export default function TasksList({ onFileSelect }: TasksListProps) {
  // Tasks from private notes arrive masked, or are left out (and not
  // counted) in "hidden" Privacy Mode.
  const allTasks = useAtomValue(atom_visibleTasks);
  const tasks = useAtomValue(atom_filteredTasks);
  const allTags = useAtomValue(atom_allTaskTags);
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const { setTaskStatus, restoreTaskLine } = useTaskWriteback();
  const [view, setView] = useAtom(atom_taskView);
  const [groupBy, setGroupBy] = useAtom(atom_tasksGroupBy);
  const [searchQuery, setSearchQuery] = useAtom(atom_taskSearchQuery);
  const [tagFilter, setTagFilter] = useAtom(atom_taskTagFilter);
  const [sort, setSort] = React.useState<TaskSort>("dueDate:asc");
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<TaskStatus, boolean>>({
    todo: false,
    prog: false,
    hold: false,
    done: true,
    cancelled: true,
  });
  const [collapsedFiles, setCollapsedFiles] = React.useState<Record<string, boolean>>({});
  const toggleCollapsed = (g: TaskStatus) => setCollapsedGroups((prev) => ({ ...prev, [g]: !prev[g] }));
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

  const groups = React.useMemo((): ListGroup[] => {
    if (view === "board") {
      return buildBoardColumns(tasks, noteTitle).map((column) => ({ ...column, subtitles: true }));
    }
    if (view !== "all") {
      return buildViewSections(view, tasks, today, noteTitle).map((section) => ({ ...section, subtitles: true }));
    }
    const [field, direction] = sort.split(":") as [TaskSortField, TaskSortDirection];
    if (groupBy === "status") {
      const byStatus: Record<TaskStatus, DisplayTask[]> = { todo: [], prog: [], hold: [], done: [], cancelled: [] };
      for (const t of tasks) byStatus[t.status].push(t);
      return GROUP_ORDER.filter((g) => byStatus[g].length > 0).map((g) => ({
        id: g,
        title: TASK_STATUS_LABEL[g],
        status: g,
        collapse: "status" as const,
        subtitles: true,
        tasks: sortTasks(byStatus[g], field, direction, noteTitle),
      }));
    }
    const byPath = new Map<string, DisplayTask[]>();
    for (const t of tasks) {
      const list = byPath.get(t.path);
      if (list) list.push(t);
      else byPath.set(t.path, [t]);
    }
    return Array.from(byPath.entries())
      .sort(([a], [b]) => noteTitle(a).localeCompare(noteTitle(b)))
      .map(([path, list]) => ({
        id: path,
        title: noteTitle(path),
        caps: false,
        collapse: "file" as const,
        subtitles: false,
        tasks: sortTasks(list, field, direction, noteTitle),
      }));
  }, [view, tasks, today, noteTitle, sort, groupBy]);

  // A status change holds the list still for a beat (use-task-linger.ts),
  // writes the line back, then offers Undo, which puts the line back
  // exactly as it was, stamps included. A masked task isn't named. A card
  // dropped on the board moves at once (`linger` false): it's already where
  // the user put it.
  const layoutKey = [view, groupBy, sort, searchQuery, tagFilter.join(" ")].join("|");
  const linger = useTaskLinger(groups, tasks, layoutKey);
  const changeStatus = async (task: DisplayTask, status: TaskStatus, lingerFirst = true) => {
    if (task.status === status) return;
    if (lingerFirst) linger.hold(task, status);
    const change = await setTaskStatus(task, status);
    if (!change) return;
    showUndoToast(
      `${STATUS_VERB[status]} ${task.isMasked ? "a task" : quoted(task.text || "(empty task)")}`,
      () => void restoreTaskLine(change),
      { id: "task-status" },
    );
  };

  // The note's handle comes from its metadata, or from the vault by path
  // when the index has none (entries restored from the cache carry no handle).
  const handleNavigate = async (task: TaskItem) => {
    let handle = (fileMetadata[task.path]?.handle as FileSystemFileHandle | null | undefined) ?? null;
    if (!handle && vaultHandle) {
      try {
        handle = await resolveFileHandleAtPath(vaultHandle, task.path);
      } catch {
        handle = null;
      }
    }
    if (!handle) {
      toast.error("Couldn't find this task's note");
      return;
    }
    onFileSelect(handle, task.path, task.line);
  };

  const renderRow = (task: DisplayTask, subtitle?: string) => (
    <TaskRow
      key={task.id}
      task={task}
      subtitle={subtitle}
      onToggle={() => changeStatus(task, toggledStatus(task.status))}
      onSetStatus={(status) => changeStatus(task, status)}
      onNavigate={() => void handleNavigate(task)}
    />
  );

  const isEmpty = allTasks.length === 0;
  const shown = linger.groups;

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

      {view === "board" && !isEmpty ? (
        <div className="flex-1 min-h-0">
          <TaskBoard
            columns={shown}
            renderCard={(task) => renderRow(task, noteTitle(task.path))}
            onMove={(task, status) => void changeStatus(task, status, false)}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4 px-2.5 pt-1 pb-3 custom-scrollbar">
          {isEmpty ? (
            <div className="px-3 py-6 text-ui-footnote italic opacity-40 text-center">
              <HiOutlineCheckCircle size={20} className="mx-auto mb-1 opacity-60" />
              No outstanding tasks
            </div>
          ) : shown.length === 0 ? (
            <div className="px-3 py-6 text-ui-footnote italic opacity-40 text-center">{EMPTY_VIEW[view]}</div>
          ) : (
            shown.map((group) => {
              const collapsed =
                group.collapse === "status"
                  ? collapsedGroups[group.id as TaskStatus]
                  : group.collapse === "file"
                    ? !!collapsedFiles[group.id]
                    : false;
              const onToggle =
                group.collapse === "status"
                  ? () => toggleCollapsed(group.id as TaskStatus)
                  : group.collapse === "file"
                    ? () => toggleCollapsedFile(group.id)
                    : undefined;
              return (
                <TaskSection
                  key={group.id}
                  title={group.title}
                  count={group.tasks.length}
                  status={group.status}
                  overdue={group.overdue}
                  caps={group.caps}
                  collapsed={collapsed}
                  onToggle={onToggle}
                >
                  {group.tasks.map((task) => renderRow(task, group.subtitles ? noteTitle(task.path) : undefined))}
                </TaskSection>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
