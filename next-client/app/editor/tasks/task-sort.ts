import type { TaskItem } from "@/app/utils/taskExtractor";

export type TaskSortField = "dueDate" | "priority" | "status" | "note" | "text";
export type TaskSortDirection = "asc" | "desc";

const PRIORITY_ORDER: Record<NonNullable<TaskItem["priority"]>, number> = {
  high: 3,
  med: 2,
  low: 1,
};

function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function statusRank(task: TaskItem): number {
  if (task.checked) return 3;
  if (task.inProgress) return 1;
  if (task.onHold) return 2;
  return 0;
}

function compareDueDate(a: TaskItem, b: TaskItem): number {
  if (a.dueDate && b.dueDate) return compareText(a.dueDate, b.dueDate);
  if (a.dueDate) return -1;
  if (b.dueDate) return 1;
  return 0;
}

export function sortTasks(
  tasks: TaskItem[],
  field: TaskSortField,
  direction: TaskSortDirection,
  noteTitle: (path: string) => string,
): TaskItem[] {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...tasks].sort((a, b) => {
    const primary = field === "dueDate"
      ? compareDueDate(a, b)
      : field === "priority"
        ? (PRIORITY_ORDER[a.priority ?? "low"] - PRIORITY_ORDER[b.priority ?? "low"])
        : field === "status"
          ? statusRank(a) - statusRank(b)
          : field === "note"
            ? compareText(noteTitle(a.path), noteTitle(b.path))
            : compareText(a.text, b.text);
    if (primary) return primary * multiplier;

    // Due-date ordering intentionally uses priority descending as its
    // tiebreaker, including the default due-date-ascending view.
    const priority = PRIORITY_ORDER[b.priority ?? "low"] - PRIORITY_ORDER[a.priority ?? "low"];
    if (priority) return priority;

    const note = compareText(noteTitle(a.path), noteTitle(b.path));
    return note || a.line - b.line;
  });
}
