export type TaskPriority = "high" | "med" | "low";

export interface TaskItem {
  id: string; // `${path}#${line}`
  path: string;
  line: number; // 0-indexed
  checked: boolean;
  inProgress: boolean; // unchecked task tagged #prog
  onHold: boolean; // unchecked task tagged #hold
  dueDate: string | null; // from @due(YYYY-MM-DD), verbatim string
  priority: TaskPriority | null; // from @priority(high|med|low)
  tags: string[]; // non-status #tags, lowercase, de-duplicated, in appearance order
  text: string; // display text, checkbox marker + tags + @due()/@priority() stripped
  raw: string; // full original line, used for write-back
  lineHash: string; // fingerprint of `raw`, staleness guard for write-back
}

export const REGEX_TASK_LINE = /^(\s*[-*]\s*\[)([ xX/])(\]\s*)(.*)$/;
export const REGEX_TASK_PROG = /#prog\b/i;
export const REGEX_TASK_HOLD = /#hold\b/i;
export const REGEX_TASK_DUE = /@due\(\s*([^)]+?)\s*\)/i;
export const REGEX_TASK_PRIORITY = /@priority\(\s*(high|med|low)\s*\)/i;
const STATUS_TAG_NAMES = new Set(["todo", "prog", "hold", "done"]);
const REGEX_TASK_TAG = /#([a-z][\w-]*)/gi;
// Strips @due()/@priority() metadata plus every #tag (status and custom
// alike — custom tags are surfaced separately as pills, not left inline) from
// the displayed text. Also swallows an enclosing pair of parens (e.g.
// "(#todo)") so stripping doesn't leave a bare "()" behind.
const REGEX_TASK_CLEANUP = /@(?:due|priority)\([^)]*\)|\(\s*#(?:todo|prog|hold|done)\s*\)|#[a-z][\w-]*/gi;

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
    const checked = m[2].toLowerCase() === "x";
    // "/" is the widely-used Obsidian-style in-progress marker, in addition
    // to the existing #prog tag convention.
    const inProgress = !checked && (m[2] === "/" || REGEX_TASK_PROG.test(raw));
    const onHold = !checked && !inProgress && REGEX_TASK_HOLD.test(raw);
    const dueMatch = m[4].match(REGEX_TASK_DUE);
    const dueDate = dueMatch ? dueMatch[1].trim() : null;
    const priorityMatch = m[4].match(REGEX_TASK_PRIORITY);
    const priority = priorityMatch ? (priorityMatch[1].toLowerCase() as TaskPriority) : null;
    const tags = Array.from(
      new Set(
        Array.from(m[4].matchAll(REGEX_TASK_TAG))
          .map((tm) => tm[1].toLowerCase())
          .filter((tag) => !STATUS_TAG_NAMES.has(tag)),
      ),
    );
    const text = m[4].replace(REGEX_TASK_CLEANUP, "").replace(/\s+/g, " ").trim();
    tasks.push({
      id: `${path}#${i}`,
      path,
      line: i,
      checked,
      inProgress,
      onHold,
      dueDate,
      priority,
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

// Surgically flips the checkbox character on a task's line, guarding against
// the file having drifted since the task was scanned. Returns null (no-op)
// rather than risk corrupting an unrelated line if the target can't be
// located with confidence.
export function patchLineInContent(content: string, task: TaskItem): string | null {
  const lines = content.split("\n");
  let targetLine = task.line;
  const current = lines[targetLine];
  if (current === undefined || simpleHash(current) !== task.lineHash) {
    const found = findNearbyLine(lines, task.line, task.raw);
    if (found === -1) return null;
    targetLine = found;
  }

  const toggled = lines[targetLine].replace(
    REGEX_TASK_LINE,
    (_m, pre, _box, post, rest) => `${pre}${task.checked ? " " : "x"}${post}${rest}`,
  );
  if (toggled === lines[targetLine]) return null;
  lines[targetLine] = toggled;
  return lines.join("\n");
}
