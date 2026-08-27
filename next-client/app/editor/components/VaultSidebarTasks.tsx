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
  atom_allTasks,
  atom_allTaskTags,
  atom_taskSearchQuery,
  atom_taskTagFilter,
  atom_taskDueFilter,
  TaskDueFilter,
} from "@/app/atoms/task-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_tasksGroupBy } from "@/app/atoms/ui-atoms";
import { TaskItem } from "@/app/utils/taskExtractor";
import { useTaskWriteback } from "@/app/hooks/use-task-writeback";
import { SelectControl } from "@/app/editor/settings/components/SettingControls";

interface VaultSidebarTasksProps {
  onFileSelect: (handle: FileSystemFileHandle, path: string, line: number) => void;
}

type Group = "todo" | "prog" | "hold" | "done";
type GroupBy = "status" | "file";

const GROUP_LABEL: Record<Group, string> = { todo: "To Do", prog: "In Progress", hold: "On Hold", done: "Done" };

// Shared status dot color per group — same tokens used by the Tasks dialog /
// search input, kept consistent here so a task's color means the same thing
// everywhere. Explicit dark: variants since these are plain Tailwind hues,
// not the app's CSS-var-backed semantic colors.
const GROUP_ACCENT: Record<Group, { dot: string }> = {
  todo: { dot: "bg-sage" },
  prog: { dot: "bg-amber-500 dark:bg-amber-400" },
  hold: { dot: "bg-sky-500 dark:bg-sky-400" },
  done: { dot: "bg-emerald-500 dark:bg-emerald-400" },
};

const DUE_FILTER_OPTIONS: { value: TaskDueFilter; label: string }[] = [
  { value: "all", label: "All dates" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "none", label: "No due date" },
];

function groupOf(task: TaskItem): Group {
  if (task.checked) return "done";
  if (task.inProgress) return "prog";
  if (task.onHold) return "hold";

  return "todo";
}

function TaskCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <label className="relative flex items-center mt-0.5 shrink-0 cursor-pointer">
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

export default function VaultSidebarTasks({ onFileSelect }: VaultSidebarTasksProps) {
  const allTasks = useAtomValue(atom_allTasks);
  const tasks = useAtomValue(atom_filteredTasks);
  const allTags = useAtomValue(atom_allTaskTags);
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const { toggleTask } = useTaskWriteback();
  const [groupBy, setGroupBy] = useAtom(atom_tasksGroupBy);
  const [searchQuery, setSearchQuery] = useAtom(atom_taskSearchQuery);
  const [tagFilter, setTagFilter] = useAtom(atom_taskTagFilter);
  const [dueFilter, setDueFilter] = useAtom(atom_taskDueFilter);
  const [collapsed, setCollapsed] = React.useState<Record<Group, boolean>>({
    todo: false,
    prog: false,
    hold: false,
    done: true,
  });
  const [collapsedFiles, setCollapsedFiles] = React.useState<Record<string, boolean>>({});
  const toggleCollapsed = (g: Group) =>
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
    const out: Record<Group, TaskItem[]> = { todo: [], prog: [], hold: [], done: [] };
    for (const t of tasks) out[groupOf(t)].push(t);
    for (const g of Object.values(out)) g.sort((a, b) => noteTitle(a.path).localeCompare(noteTitle(b.path)));
    return out;
  }, [tasks, noteTitle]);

  const fileGroups = React.useMemo(() => {
    const byPath = new Map<string, TaskItem[]>();
    for (const t of tasks) {
      const list = byPath.get(t.path);
      if (list) list.push(t);
      else byPath.set(t.path, [t]);
    }
    for (const list of byPath.values()) list.sort((a, b) => a.line - b.line);
    return Array.from(byPath.entries()).sort((a, b) => noteTitle(a[0]).localeCompare(noteTitle(b[0])));
  }, [tasks, noteTitle]);

  const handleNavigate = (task: TaskItem) => {
    const meta = fileMetadata[task.path];
    if (!meta?.handle) return;
    onFileSelect(meta.handle, task.path, task.line);
  };

  const visibleGroups: Group[] = ["todo", "prog", "hold", "done"];
  const isEmpty = allTasks.length === 0;
  const noMatches = !isEmpty && tasks.length === 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-2 px-3 pt-2">
        <div className="relative flex-1 min-w-0">
          <HiOutlineSearch size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-stone pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter tasks..."
            className="w-full pl-6 pr-2 py-1 text-ui-caption rounded-md bg-paper-softgray dark:bg-paper-dark-surface/50 text-ink-light dark:text-ink-dark placeholder:text-stone outline-none focus-visible:ring-2 focus-visible:ring-sage/30"
          />
        </div>
        <div className="flex items-center rounded-md bg-paper-softgray dark:bg-paper-dark-surface/50 p-0.5 shrink-0">
          <button
            type="button"
            title="Group by status"
            onClick={() => setGroupBy("status")}
            className={`flex items-center justify-center w-6 h-6 rounded transition-colors ${groupBy === "status" ? "bg-paper-light dark:bg-paper-dark-surface shadow-sm text-ink-light dark:text-ink-dark" : "text-ink-muted dark:text-stone opacity-60 hover:opacity-100"
              }`}
          >
            <HiOutlineViewList size={14} />
          </button>
          <button
            type="button"
            title="Group by file"
            onClick={() => setGroupBy("file")}
            className={`flex items-center justify-center w-6 h-6 rounded transition-colors ${groupBy === "file" ? "bg-paper-light dark:bg-paper-dark-surface shadow-sm text-ink-light dark:text-ink-dark" : "text-ink-muted dark:text-stone opacity-60 hover:opacity-100"
              }`}
          >
            <HiOutlineDocumentText size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 px-3 pt-2">
        <SelectControl value={dueFilter} onChange={(v) => setDueFilter(v as TaskDueFilter)} size="sm" fullWidth={false}>
          {DUE_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </SelectControl>
        {allTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTagFilter(tag)}
            className={`text-ui-footnote px-2 py-1 rounded-full border transition-colors ${
              tagFilter.includes(tag)
                ? "bg-sage/15 border-sage text-sage"
                : "bg-transparent border-beige dark:border-clay text-ink-muted dark:text-stone hover:border-sage hover:text-sage"
            }`}
          >
            #{tag}
          </button>
        ))}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-0.5 text-ui-footnote px-1.5 py-1 text-ink-muted dark:text-stone hover:text-ink-light dark:hover:text-ink-dark transition-colors"
          >
            <HiX size={11} />
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 px-2 pt-2 pb-2 custom-scrollbar">
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
          visibleGroups.map((g) =>
            statusGroups[g].length === 0 ? null : (
              <div key={g}>
                <button
                  type="button"
                  onClick={() => toggleCollapsed(g)}
                  className="flex items-center gap-1 w-full px-3 pb-1 text-ui-footnote font-medium uppercase tracking-wide text-ink-muted dark:text-stone opacity-60 hover:opacity-100 transition-opacity"
                >
                  {collapsed[g] ? <HiChevronRight size={12} /> : <HiChevronDown size={12} />}
                  <span className={`w-1.5 h-1.5 rounded-full ${GROUP_ACCENT[g].dot}`} />
                  {GROUP_LABEL[g]}
                  <span className="font-normal normal-case opacity-70">({statusGroups[g].length})</span>
                </button>
                {!collapsed[g] && (
                  <div className="space-y-0.5">
                    {statusGroups[g].map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        subtitle={noteTitle(task.path)}
                        onToggle={() => toggleTask(task)}
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
              <button
                type="button"
                onClick={() => toggleCollapsedFile(path)}
                className="flex items-center gap-1 w-full px-3 pb-1 text-ui-footnote font-medium text-ink-muted dark:text-stone opacity-60 hover:opacity-100 transition-opacity"
              >
                {collapsedFiles[path] ? <HiChevronRight size={12} /> : <HiChevronDown size={12} />}
                <span className="truncate">{noteTitle(path)}</span>
                <span className="font-normal opacity-70 shrink-0">({fileTasks.length})</span>
              </button>
              {!collapsedFiles[path] && (
                <div className="space-y-0.5">
                  {fileTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={() => toggleTask(task)}
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

function formatDueDate(dueDate: string, checked: boolean): { label: string; className: string } {
  const today = new Date().toISOString().slice(0, 10);
  if (checked) return { label: `Due: ${dueDate}`, className: "text-ink-muted dark:text-stone" };
  if (dueDate < today) return { label: `Overdue · ${dueDate}`, className: "text-red-600 dark:text-red-400" };
  if (dueDate === today) return { label: "Due: Today", className: "text-amber-600 dark:text-amber-400" };
  return { label: `Due: ${dueDate}`, className: "text-ink-muted dark:text-stone" };
}

function TaskRow({
  task,
  subtitle,
  onToggle,
  onNavigate,
}: {
  task: TaskItem;
  subtitle?: string;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const due = task.dueDate ? formatDueDate(task.dueDate, task.checked) : null;
  return (
    <div className="group flex items-start gap-2 px-3 py-1.5 rounded-md hover:bg-paper-softgray dark:hover:bg-paper-dark-surface/50 transition-colors">
      <TaskCheckbox checked={task.checked} onChange={onToggle} />
      <div className="min-w-0 flex-1 cursor-pointer" onClick={onNavigate}>
        <div
          className={`text-ui-caption truncate ${task.checked ? "line-through opacity-50" : "text-ink-light dark:text-ink-dark"
            }`}
        >
          {task.text || "(empty task)"}
        </div>
        {(subtitle || due || task.tags.length > 0) && (
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5">
            {subtitle && <span className="text-ui-footnote text-ink-muted dark:text-stone truncate">{subtitle}</span>}
            {due && <span className={`text-ui-footnote shrink-0 ${due.className}`}>{due.label}</span>}
            {task.tags.map((tag) => (
              <span key={tag} className="text-ui-footnote text-sage shrink-0">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
