import type { TaskView } from "@/app/atoms/ui-atoms";
import type { TaskItem } from "@/app/utils/taskExtractor";
import { isOpenStatus, type TaskStatus } from "@/app/utils/task-status";
import { localISODate } from "@/app/utils/task-line";
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

export { localISODate };

const parseISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// An Upcoming section title: "Tomorrow", a weekday within the week
// ("Friday"), then "Mon 20 Oct" (with the year when it isn't this one).
// Built by hand rather than with toLocaleDateString, whose punctuation
// varies between ICU versions.
export function upcomingLabel(due: string, today: string): string {
  if (!REGEX_ISO_DATE.test(due)) return due;
  const date = parseISO(due);
  const days = Math.round((date.getTime() - parseISO(today).getTime()) / 86_400_000);
  const weekday = WEEKDAYS[date.getDay()];
  if (days === 1) return "Tomorrow";
  if (days < 7) return weekday;
  const label = `${weekday.slice(0, 3)} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return due.slice(0, 4) === today.slice(0, 4) ? label : `${label} ${date.getFullYear()}`;
}

// How long ago a work stamp's day was: "today", "yesterday", "3 days ago"
// within the week, then "5 Oct" (with the year when it isn't this one).
// Null for a date that isn't ISO or lies ahead.
export function sinceLabel(iso: string, today: string): string | null {
  if (!REGEX_ISO_DATE.test(iso) || iso > today) return null;
  const date = parseISO(iso);
  const days = Math.round((parseISO(today).getTime() - date.getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const label = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return iso.slice(0, 4) === today.slice(0, 4) ? label : `${label} ${date.getFullYear()}`;
}

// The row's work-date note: "Started 2 days ago" while a task is under way
// or on hold, "Done today" once done; null otherwise or without a stamp.
export function workDateLabel(task: TaskItem, today: string): string | null {
  if ((task.status === "prog" || task.status === "hold") && task.startedDate) {
    const since = sinceLabel(task.startedDate, today);
    return since && `Started ${since}`;
  }
  if (task.status === "done" && task.doneDate) {
    const since = sinceLabel(task.doneDate, today);
    return since && `Done ${since}`;
  }
  return null;
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
