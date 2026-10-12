import type { FileMetadata } from "@/app/atoms/metadata";
import { isSensitiveFrontmatter } from "@/app/utils/note-privacy";
import { collectRollup, type CollectOptions } from "@/app/utils/rollup/collect";
import type { RollupPeriod } from "@/app/utils/rollup/period";
import { renderGeneratedBody } from "@/app/utils/rollup/render";
import { isOpenStatus, TASK_STATUS_CHAR, TASK_STATUS_LABEL } from "@/app/utils/task-status";
import type { TaskItem } from "@/app/utils/taskExtractor";

// The data the weekly review and tasks chat skills send with their
// instructions (chat-skills.ts). Pure: use-chat-skills.ts gathers the inputs.
// Private notes (sensitive frontmatter or content) are left out and only
// counted, like everywhere else note text could leave the device.

// Caps, so a busy week or a big vault can't crowd out the conversation.
export const WEEK_DAYS_CHAR_LIMIT = 12_000;
export const OPEN_TASKS_LIMIT = 150;

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "Today is 2026-10-12 (Monday)." for prompts that work out dates. */
export function todayLine(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `Today is ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} (${WEEKDAY[now.getDay()]}).`;
}

/** Which week a review asks about: last week (-1) when the latest asking message says so, else this week. */
export function reviewWeekOffset(asking: string | undefined): 0 | -1 {
  return asking && /\b(?:last|previous|past)\s+week\b/i.test(asking) ? -1 : 0;
}

const privateNote = (count: number, what: string) =>
  count ? `\n(${count} private ${what}${count === 1 ? "" : "s"} left out.)` : "";

// The week's rollup (done, blocked, still open; `options` adds tasks done in
// other notes, as the rollup sheet does) and each day's sheet.
export function weekDataBlock(
  period: RollupPeriod,
  sheets: { date: string; text: string; sensitive?: boolean }[],
  options: CollectOptions = {},
): string {
  const kept = sheets.filter((sheet) => !sheet.sensitive);
  const left = sheets.length - kept.length;
  if (!kept.length && !options.doneElsewhere?.length) {
    return `--- WEEK DATA: ${period.heading} (${period.name}) ---\nNo daily sheets for this week.${privateNote(left, "daily sheet")}\n--- END WEEK DATA ---`;
  }
  const days: string[] = [];
  let used = 0;
  for (const sheet of [...kept].sort((a, b) => a.date.localeCompare(b.date))) {
    const room = WEEK_DAYS_CHAR_LIMIT - used;
    if (room <= 0) break;
    const text = sheet.text.length > room ? `${sheet.text.slice(0, room)}\n[sheet continues…]` : sheet.text;
    used += text.length;
    days.push(`### [[${sheet.date}]]\n${text.trim()}`);
  }
  return `--- WEEK DATA: ${period.heading} (${period.name}) ---
${renderGeneratedBody(period, collectRollup(kept, options))}

## Daily sheets
${days.length ? days.join("\n\n") : "None."}${privateNote(left, "daily sheet")}
--- END WEEK DATA ---`;
}

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

// The vault's open tasks, as task lines naming their note.
export function openTasksBlock(
  meta: Record<string, FileMetadata>,
  now: Date,
  skip: (path: string) => boolean = () => false,
): string {
  const open: { task: TaskItem; note: string }[] = [];
  let left = 0;
  for (const file of Object.values(meta)) {
    if (skip(file.path)) continue;
    const tasks = (file.tasks || []).filter((task) => isOpenStatus(task.status));
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
