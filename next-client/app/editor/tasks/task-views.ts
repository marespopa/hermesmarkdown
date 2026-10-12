import type { TaskView } from "@/app/atoms/ui-atoms";
import type { TaskItem } from "@/app/utils/taskExtractor";
import { isOpenStatus, type TaskStatus } from "@/app/utils/task-status";
import { sortTasks } from "./task-sort";

// The Tasks page's smart lists. Each is a fixed set of sections built from
// the (already searched and tag-filtered) tasks; All keeps the user's own
// grouping and sort instead (TasksList). Only open tasks (to do, in
// progress, on hold) show in Now, Today and Upcoming.
//   Now:      In Progress, then the next few to-dos (Up Next) by due date.
//   Today:    Overdue, then due today.
//   Upcoming: one section per later due date.

export type SmartView = Exclude<TaskView, "all">;

export const TASK_VIEWS: { id: TaskView; label: string }[] = [
  { id: "now", label: "Now" },
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "all", label: "All" },
];

export const UP_NEXT_LIMIT = 5;

export interface TaskSectionData<T extends TaskItem = TaskItem> {
  id: string;
  title: string;
  /** Shows that status's ring by the title. */
  status?: TaskStatus;
  /** Overdue: the title reads in the warning color. */
  overdue?: boolean;
  tasks: T[];
}

const REGEX_ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Today as "YYYY-MM-DD" in local time, the format @due() dates are written in.
export function localISODate(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const parseISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// An Upcoming section title: "Tomorrow", a weekday within the week
// ("Friday"), then "Mon 20 Oct" (with the year when it isn't this one).
export function upcomingLabel(due: string, today: string): string {
  if (!REGEX_ISO_DATE.test(due)) return due;
  const date = parseISO(due);
  const days = Math.round((date.getTime() - parseISO(today).getTime()) / 86_400_000);
  if (days === 1) return "Tomorrow";
  if (days < 7) return date.toLocaleDateString("en-GB", { weekday: "long" });
  const sameYear = due.slice(0, 4) === today.slice(0, 4);
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

const isDated = (task: TaskItem) => !!task.dueDate && REGEX_ISO_DATE.test(task.dueDate);

export function buildViewSections<T extends TaskItem>(
  view: SmartView,
  tasks: T[],
  today: string,
  noteTitle: (path: string) => string,
): TaskSectionData<T>[] {
  const byDue = (list: T[]) => sortTasks(list, "dueDate", "asc", noteTitle);
  const open = tasks.filter((t) => isOpenStatus(t.status));
  const sections: TaskSectionData<T>[] = [];
  const add = (section: TaskSectionData<T>) => {
    if (section.tasks.length > 0) sections.push(section);
  };

  if (view === "now") {
    add({ id: "prog", title: "In Progress", status: "prog", tasks: byDue(open.filter((t) => t.status === "prog")) });
    add({ id: "next", title: "Up Next", status: "todo", tasks: byDue(open.filter((t) => t.status === "todo")).slice(0, UP_NEXT_LIMIT) });
  } else if (view === "today") {
    const dated = open.filter(isDated);
    add({ id: "overdue", title: "Overdue", overdue: true, tasks: byDue(dated.filter((t) => t.dueDate! < today)) });
    add({ id: "today", title: "Today", tasks: byDue(dated.filter((t) => t.dueDate === today)) });
  } else {
    const byDate = new Map<string, T[]>();
    for (const task of byDue(open.filter((t) => isDated(t) && t.dueDate! > today))) {
      const list = byDate.get(task.dueDate!);
      if (list) list.push(task);
      else byDate.set(task.dueDate!, [task]);
    }
    for (const [due, list] of byDate) add({ id: due, title: upcomingLabel(due, today), tasks: list });
  }
  return sections;
}

// How many tasks each list shows, for the view switcher's counts.
export function viewCounts(
  tasks: TaskItem[],
  today: string,
  noteTitle: (path: string) => string,
): Record<TaskView, number> {
  const count = (view: SmartView) =>
    buildViewSections(view, tasks, today, noteTitle).reduce((n, section) => n + section.tasks.length, 0);
  return { now: count("now"), today: count("today"), upcoming: count("upcoming"), all: tasks.length };
}
