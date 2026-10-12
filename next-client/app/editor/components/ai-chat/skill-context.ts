import type { FileMetadata } from "@/app/atoms/metadata";
import { isSensitiveFrontmatter } from "@/app/utils/note-privacy";
import { localISODate } from "@/app/utils/task-line";
import { isOpenStatus, TASK_STATUS_CHAR, TASK_STATUS_LABEL } from "@/app/utils/task-status";
import type { TaskItem } from "@/app/utils/taskExtractor";

// The data the tasks chat skill sends with their
// instructions (chat-skills.ts). Pure: use-chat-skills.ts gathers the inputs.
// Private notes (private frontmatter or content) are left out and only
// counted, like everywhere else note text could leave the device.

// A cap, so a big vault can't crowd out the conversation.
export const OPEN_TASKS_LIMIT = 150;

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "Today is 2026-10-12 (Monday)." for prompts that work out dates. */
export function todayLine(now: Date): string {
  return `Today is ${localISODate(now)} (${WEEKDAY[now.getDay()]}).`;
}

const privateNote = (count: number, what: string) =>
  count ? `\n(${count} private ${what}${count === 1 ? "" : "s"} left out.)` : "";

const PRIORITY_RANK = { high: 0, med: 1, low: 2 } as const;

// Most pressing first: in progress, then by due date (overdue first), then
// priority; tasks with no date after those that have one.
function compareTasks(a: TaskItem, b: TaskItem): number {
  if ((a.status === "prog") !== (b.status === "prog")) return a.status === "prog" ? -1 : 1;
  if (a.dueDate !== b.dueDate) {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  }
  return (a.priority ? PRIORITY_RANK[a.priority] : 3) - (b.priority ? PRIORITY_RANK[b.priority] : 3);
}

const taskLine = (task: TaskItem, note: string) =>
  [
    `- [${TASK_STATUS_CHAR[task.status]}] ${task.text || "(empty task)"}`,
    task.dueDate && `@due(${task.dueDate})`,
    task.priority && `@priority(${task.priority})`,
    ...task.tags.map((tag) => `#${tag}`),
    `· [[${note}]]`,
  ].filter(Boolean).join(" ");

// The vault's open tasks, as task lines naming their note. `filter` narrows
// them (the list_open_tasks tool's views), given today's "YYYY-MM-DD".
export function openTasksBlock(
  meta: Record<string, FileMetadata>,
  now: Date,
  skip: (path: string) => boolean = () => false,
  filter: (task: TaskItem, today: string) => boolean = () => true,
): string {
  const today = localISODate(now);
  const open: { task: TaskItem; note: string }[] = [];
  let left = 0;
  for (const file of Object.values(meta)) {
    if (skip(file.path)) continue;
    const tasks = (file.tasks || []).filter((task) => isOpenStatus(task.status) && filter(task, today));
    if (!tasks.length) continue;
    if (isSensitiveFrontmatter(file.frontmatter)) {
      left += tasks.length;
      continue;
    }
    const note = file.name.replace(/\.md$/i, "");
    for (const task of tasks) open.push({ task, note });
  }
  open.sort((a, b) => compareTasks(a.task, b.task));
  const shown = open.slice(0, OPEN_TASKS_LIMIT);
  const counts = (["prog", "todo", "hold"] as const)
    .map((status) => `${open.filter((o) => o.task.status === status).length} ${TASK_STATUS_LABEL[status].toLowerCase()}`)
    .join(", ");
  return [
    `--- OPEN TASKS (${counts}) ---`,
    todayLine(now),
    shown.length ? shown.map((o) => taskLine(o.task, o.note)).join("\n") : "No open tasks.",
    open.length > shown.length ? `…and ${open.length - shown.length} more, less pressing.` : "",
    privateNote(left, "task").trim(),
    "--- END OPEN TASKS ---",
  ].filter(Boolean).join("\n");
}
