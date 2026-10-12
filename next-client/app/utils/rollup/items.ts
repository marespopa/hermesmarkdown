// Reading a rollup sheet back: its item lines (`- Fix login #bug · [[2026-10-06]]`),
// the task each one came from, the summary line, and which lines a refresh
// added. Pure; used by the editor (checkboxes, fresh-line tint, stat strip)
// and by the item actions (tick a task, open its day at the task).

import { extractTasks, type TaskItem } from "../taskExtractor";
import { rollupKey } from "./collect";

export interface RollupItemRef {
  text: string; // the item text, tags and details removed
  date: string; // "YYYY-MM-DD", the day it links to
}

export interface RollupSummary {
  done: number;
  open: number;
  blocked: number;
}

// `- text #tag · in progress · due 2026-10-09 · [[2026-10-06]]`, optionally
// inside a folded callout (`> - …`).
const REGEX_ITEM = /^(?:>\s*)?-\s+(.*?)\s+·\s+\[\[(\d{4}-\d{2}-\d{2})\]\]\s*$/;
const REGEX_DETAILS = /(?:\s+·\s+(?:in progress|due \S+))+$/;
const REGEX_TAG = /(^|\s)#[a-z][\w-]*/gi;
const REGEX_SUMMARY = /^(\d+) done · (\d+) open · (\d+) blocked$/;

export function parseRollupItem(line: string): RollupItemRef | null {
  const match = REGEX_ITEM.exec(line);
  if (!match) return null;
  const text = match[1].replace(REGEX_DETAILS, "").replace(REGEX_TAG, "$1").replace(/^\\\[/, "[").replace(/\s+/g, " ").trim();
  return text ? { text, date: match[2] } : null;
}

// The task an item came from in its day's text: the last task line with the
// same text (the one the rollup kept), or null when it's gone.
export function findSourceTask(dayText: string, item: RollupItemRef): TaskItem | null {
  const key = rollupKey(item.text);
  const tasks = extractTasks(item.date, dayText).filter((task) => rollupKey(task.text) === key);
  return tasks.length ? tasks[tasks.length - 1] : null;
}

export function parseSummary(line: string): RollupSummary | null {
  const match = REGEX_SUMMARY.exec(line.trim());
  return match ? { done: Number(match[1]), open: Number(match[2]), blocked: Number(match[3]) } : null;
}

// The summary line of a rollup sheet's text (the first line after rollup:start).
export function summaryOf(content: string, startMarker: RegExp): RollupSummary | null {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((line) => startMarker.test(line));
  return start === -1 ? null : parseSummary(lines[start + 1] ?? "");
}

// Item lines in `next` that weren't in `previous` (null = a new sheet: none
// are new). Compared as trimmed lines, so a callout's `> ` prefix counts.
export function addedItemLines(previous: string | null, next: string): string[] {
  if (previous === null) return [];
  const before = new Set(previous.split(/\r?\n/).map((line) => line.trim()));
  return next
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => REGEX_ITEM.test(line) && !before.has(line));
}
