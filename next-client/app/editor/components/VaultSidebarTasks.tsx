"use client";

import React from "react";
import { useAtomValue } from "jotai";
import { HiOutlineCheckCircle, HiChevronRight, HiChevronDown } from "react-icons/hi";
import { atom_allTasks } from "@/app/atoms/task-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { TaskItem } from "@/app/utils/taskExtractor";
import { useTaskWriteback } from "@/app/hooks/use-task-writeback";

interface VaultSidebarTasksProps {
  onFileSelect: (handle: FileSystemFileHandle, path: string, line: number) => void;
}

type Group = "todo" | "prog" | "done";

const GROUP_LABEL: Record<Group, string> = { todo: "To Do", prog: "In Progress", done: "Done" };

function groupOf(task: TaskItem): Group {
  if (task.checked) return "done";
  if (task.inProgress) return "prog";
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
        className={`w-4 h-4 rounded-[4px] border-2 transition-colors duration-150 flex items-center justify-center ${
          checked
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
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const { toggleTask } = useTaskWriteback();
  const [collapsed, setCollapsed] = React.useState<Record<Group, boolean>>({
    todo: false,
    prog: false,
    done: true,
  });
  const toggleCollapsed = (g: Group) =>
    setCollapsed((prev) => ({ ...prev, [g]: !prev[g] }));

  const noteTitle = React.useCallback(
    (path: string) => {
      const meta = fileMetadata[path];
      return meta?.frontmatter?.title || meta?.name || path;
    },
    [fileMetadata],
  );

  const groups = React.useMemo(() => {
    const out: Record<Group, TaskItem[]> = { todo: [], prog: [], done: [] };
    for (const t of allTasks) out[groupOf(t)].push(t);
    for (const g of Object.values(out)) g.sort((a, b) => noteTitle(a.path).localeCompare(noteTitle(b.path)));
    return out;
  }, [allTasks, noteTitle]);

  const handleNavigate = (task: TaskItem) => {
    const meta = fileMetadata[task.path];
    if (!meta?.handle) return;
    onFileSelect(meta.handle, task.path, task.line);
  };

  const visibleGroups: Group[] = ["todo", "prog", "done"];
  const isEmpty = visibleGroups.every((g) => groups[g].length === 0);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto space-y-3 px-2 pt-2 pb-2 custom-scrollbar">
        {isEmpty && (
          <div className="px-3 py-6 text-ui-footnote italic opacity-40 text-center">
            <HiOutlineCheckCircle size={20} className="mx-auto mb-1 opacity-60" />
            No outstanding tasks
          </div>
        )}
        {visibleGroups.map((g) =>
          groups[g].length === 0 ? null : (
            <div key={g}>
              <button
                type="button"
                onClick={() => toggleCollapsed(g)}
                className="flex items-center gap-1 w-full px-3 pb-1 text-ui-footnote font-medium uppercase tracking-wide text-ink-muted dark:text-stone opacity-60 hover:opacity-100 transition-opacity"
              >
                {collapsed[g] ? <HiChevronRight size={12} /> : <HiChevronDown size={12} />}
                {GROUP_LABEL[g]}
                <span className="font-normal normal-case opacity-70">({groups[g].length})</span>
              </button>
              {!collapsed[g] && (
                <div className="space-y-0.5">
                  {groups[g].map((task) => (
                    <div
                      key={task.id}
                      className="group flex items-start gap-2 px-3 py-1.5 rounded-md hover:bg-paper-softgray dark:hover:bg-paper-dark-surface/50 transition-colors"
                    >
                      <TaskCheckbox checked={task.checked} onChange={() => toggleTask(task)} />
                      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => handleNavigate(task)}>
                        <div
                          className={`text-ui-caption truncate ${
                            task.checked ? "line-through opacity-50" : "text-ink-light dark:text-ink-dark"
                          }`}
                        >
                          {task.text || "(empty task)"}
                        </div>
                        <span className="text-ui-footnote text-ink-muted dark:text-stone truncate block">
                          {noteTitle(task.path)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
