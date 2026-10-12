import { TASK_STATUS_CHAR, type TaskStatus } from "./task-status";

// Changing a task line's status: the box character, plus the dates the line
// keeps about its work. Starting a task stamps `@started(YYYY-MM-DD)` (once:
// a restart keeps the first date); completing it stamps `@done(YYYY-MM-DD)`.
// Leaving done drops `@done`; resetting to to do drops both, as if never
// started. Stamps go at the end of the line. Every status change (editor box,
// Mod-Enter, palette, Tasks page) goes through here, as
// minimal edits so a caret on the line stays put.

export interface LineEdit {
  from: number;
  to: number;
  insert: string;
}

// The box of a task line, bullet or ordered: "- [ ]", "  * [x]", "1. [/]".
const REGEX_TASK_BOX = /^(\s*(?:[-*+]|\d+[.)])\s*\[)([ xX/!-])\]/;
const stampPattern = (name: "started" | "done") => new RegExp(`[ \\t]*@${name}\\([^)]*\\)`, "g");

// Today as "YYYY-MM-DD" in local time, the format @due() dates are written in.
export function localISODate(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// The edits (offsets within `line`, sorted, non-overlapping) that give a task
// line `status`, or null when the line isn't a task.
export function statusLineEdits(line: string, status: TaskStatus, today = localISODate()): LineEdit[] | null {
  const box = REGEX_TASK_BOX.exec(line);
  if (!box) return null;
  const at = box[1].length;
  const edits: LineEdit[] = [];
  if (box[2] !== TASK_STATUS_CHAR[status]) edits.push({ from: at, to: at + 1, insert: TASK_STATUS_CHAR[status] });

  const remove = (name: "started" | "done") => {
    for (const m of line.matchAll(stampPattern(name))) edits.push({ from: m.index!, to: m.index! + m[0].length, insert: "" });
  };
  const has = (name: "started" | "done") => stampPattern(name).test(line);

  if (status !== "done") remove("done");
  if (status === "todo") remove("started");

  const stamps: string[] = [];
  if (status === "prog" && !has("started")) stamps.push(`@started(${today})`);
  if (status === "done" && !has("done")) stamps.push(`@done(${today})`);
  if (stamps.length > 0) {
    const end = line.trimEnd().length;
    edits.push({ from: end, to: end, insert: ` ${stamps.join(" ")}` });
  }
  return edits.sort((a, b) => a.from - b.from || a.to - b.to);
}

export function applyLineEdits(line: string, edits: LineEdit[]): string {
  let out = line;
  for (const edit of [...edits].reverse()) out = out.slice(0, edit.from) + edit.insert + out.slice(edit.to);
  return out;
}

// `line` with `status`, or the line unchanged when it isn't a task.
export function withTaskStatus(line: string, status: TaskStatus, today = localISODate()): string {
  const edits = statusLineEdits(line, status, today);
  return edits ? applyLineEdits(line, edits) : line;
}
