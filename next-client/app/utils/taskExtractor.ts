export interface TaskItem {
  id: string; // `${path}#${line}`
  path: string;
  line: number; // 0-indexed
  checked: boolean;
  inProgress: boolean; // unchecked task tagged #prog
  text: string; // display text, checkbox marker + #todo/#prog/#done tags stripped
  raw: string; // full original line, used for write-back
  lineHash: string; // fingerprint of `raw`, staleness guard for write-back
}

export const REGEX_TASK_LINE = /^(\s*[-*]\s*\[)([ xX])(\]\s*)(.*)$/;
export const REGEX_TASK_PROG = /#prog\b/i;
// #todo/#done are purely cosmetic status tags people type by habit — the
// checkbox + #prog already drive grouping, so strip all three from the
// displayed text rather than only #prog (which left #todo/#done visible).
const REGEX_TASK_STATUS_TAGS = /#(?:todo|prog|done)\b/gi;

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
    const inProgress = !checked && REGEX_TASK_PROG.test(raw);
    const text = m[4].replace(REGEX_TASK_STATUS_TAGS, "").replace(/\s+/g, " ").trim();
    tasks.push({
      id: `${path}#${i}`,
      path,
      line: i,
      checked,
      inProgress,
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
