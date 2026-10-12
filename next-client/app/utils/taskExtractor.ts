import { taskStatusFromChar, toggledStatus, type TaskStatus } from "./task-status";
import { withTaskStatus } from "./task-line";

export type TaskPriority = "high" | "med" | "low";

export interface TaskItem {
  id: string; // `${path}#${line}`
  path: string;
  line: number; // 0-indexed
  status: TaskStatus; // from the box character (see task-status.ts)
  checked: boolean; // status === "done"
  dueDate: string | null; // from @due(YYYY-MM-DD), verbatim string
  priority: TaskPriority | null; // from @priority(high|med|low)
  startedDate: string | null; // from @started(YYYY-MM-DD), stamped when started (task-line.ts)
  doneDate: string | null; // from @done(YYYY-MM-DD), stamped when completed
  tags: string[]; // #tags, lowercase, de-duplicated, in appearance order
  text: string; // display text, checkbox marker + tags + @due()/@priority() stripped
  raw: string; // full original line, used for write-back
  lineHash: string; // fingerprint of `raw`, staleness guard for write-back
}

export const REGEX_TASK_LINE = /^(\s*[-*]\s*\[)([ xX/!-])(\]\s*)(.*)$/;
export const REGEX_TASK_DUE = /@due\(\s*([^)]+?)\s*\)/i;
export const REGEX_TASK_PRIORITY = /@priority\(\s*(high|med|low)\s*\)/i;
export const REGEX_TASK_STARTED = /@started\(\s*([^)]+?)\s*\)/i;
export const REGEX_TASK_DONE = /@done\(\s*([^)]+?)\s*\)/i;
const REGEX_TASK_TAG = /#([a-z][\w-]*)/gi;
// Strips @due()/@priority()/@started()/@done() metadata plus every #tag (tags are surfaced
// separately as pills, not left inline) from the displayed text. Also
// swallows parens around a lone tag (e.g. "(#infra)") so stripping doesn't
// leave a bare "()" behind.
const REGEX_TASK_CLEANUP = /@(?:due|priority|started|done)\([^)]*\)|\(\s*#[a-z][\w-]*\s*\)|#[a-z][\w-]*/gi;

export function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h.toString(36);
}

export function extractTasks(path: string, content: string): TaskItem[] {
  const lines = content.split("\n");
  const tasks: TaskItem[] = [];
  lines.forEach((raw, i) => {
    const m = raw.match(REGEX_TASK_LINE);
    if (!m) return;
    const status = taskStatusFromChar(m[2]);
    const dueMatch = m[4].match(REGEX_TASK_DUE);
    const dueDate = dueMatch ? dueMatch[1].trim() : null;
    const priorityMatch = m[4].match(REGEX_TASK_PRIORITY);
    const priority = priorityMatch ? (priorityMatch[1].toLowerCase() as TaskPriority) : null;
    const startedDate = m[4].match(REGEX_TASK_STARTED)?.[1].trim() ?? null;
    const doneDate = m[4].match(REGEX_TASK_DONE)?.[1].trim() ?? null;
    const tags = Array.from(
      new Set(
        Array.from(m[4].matchAll(REGEX_TASK_TAG)).map((tm) => tm[1].toLowerCase()),
      ),
    );
    const text = m[4].replace(REGEX_TASK_CLEANUP, "").replace(/\s+/g, " ").trim();
    tasks.push({
      id: `${path}#${i}`,
      path,
      line: i,
      status,
      checked: status === "done",
      dueDate,
      priority,
      startedDate,
      doneDate,
      tags,
      text,
      raw,
      lineHash: simpleHash(raw),
    });
  });
  return tasks;
}

// Finds the current line index for a task whose expected line has drifted
// (e.g. lines were inserted/removed above it since the last scan). Searches
// outward from the expected line for an exact match on the original raw text.
function findNearbyLine(lines: string[], expectedLine: number, raw: string): number {
  const WINDOW = 25;
  for (let offset = 0; offset <= WINDOW; offset++) {
    const up = expectedLine - offset;
    const down = expectedLine + offset;
    if (up >= 0 && lines[up] === raw) return up;
    if (offset > 0 && down < lines.length && lines[down] === raw) return down;
  }
  return -1;
}

// Surgically sets a task's line to `status` (by default a click's toggle:
// open → done, closed → to do), with its @started/@done stamps
// (task-line.ts), guarding against the file
// having drifted since the task was scanned. Returns null (no-op) rather than
// risk corrupting an unrelated line if the target can't be located with
// confidence, or when the line already has that status.
export function patchLineInContent(
  content: string,
  task: TaskItem,
  status: TaskStatus = toggledStatus(task.status),
): string | null {
  const lines = content.split("\n");
  let targetLine = task.line;
  const current = lines[targetLine];
  if (current === undefined || simpleHash(current) !== task.lineHash) {
    const found = findNearbyLine(lines, task.line, task.raw);
    if (found === -1) return null;
    targetLine = found;
  }

  const toggled = REGEX_TASK_LINE.test(lines[targetLine]) ? withTaskStatus(lines[targetLine], status) : lines[targetLine];
  if (toggled === lines[targetLine]) return null;
  lines[targetLine] = toggled;
  return lines.join("\n");
}
