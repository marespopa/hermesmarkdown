// Renders a rollup sheet: the generated region between the rollup:start /
// rollup:end comment lines, and a whole new sheet around it. Items are plain
// list items, never `- [ ]` task lines, so a rollup never shows up on the
// Tasks page or counts its own lines.

import { groupDone, type RollupData, type RollupItem } from "./collect";
import type { RollupPeriod } from "./period";

export const ROLLUP_START = "<!-- rollup:start · Refresh rollup rewrites everything down to rollup:end -->";
export const ROLLUP_END = "<!-- rollup:end -->";
export const REGEX_ROLLUP_START = /^<!--\s*rollup:start\b.*-->\s*$/;
export const REGEX_ROLLUP_END = /^<!--\s*rollup:end\b.*-->\s*$/;

// A weekly sheet's Notes, collected into its month's sheet.
// The Notes of a sheet one level down: a month's weeks, a quarter's months,
// a year's quarters.
export interface ChildNotes {
  name: string; // "2026-W41" | "2026-10" | "2026-Q4"
  label: string; // "Week 41" | "October" | "Q4"
  notes: string;
}

interface ItemOptions {
  omitTag?: string | null;
  details: boolean; // "in progress" and the due date (Blocked / Still open)
}

const OTHER = "Other";

// A text that itself starts like a task box ("[ ] …") is escaped, so the
// item can never read as a task.
const safeText = (text: string) => text.replace(/^\[([ xX/!-])\]/, "\\[$1]");

// `- <text>[ #tag …][ · in progress][ · due YYYY-MM-DD] · [[YYYY-MM-DD]]`
function itemLine(item: RollupItem, { omitTag, details }: ItemOptions): string {
  const tags = item.tags.filter((tag) => tag !== omitTag).map((tag) => `#${tag}`);
  let line = `- ${[safeText(item.text), ...tags].join(" ")}`;
  if (details && item.inProgress) line += " · in progress";
  if (details && item.dueDate) line += ` · due ${item.dueDate}`;
  return `${line} · [[${item.date}]]`;
}

// A section: its heading, then its body lines, or the heading alone when empty.
const section = (heading: string, lines: string[]) => (lines.length ? `${heading}\n${lines.join("\n")}` : heading);

export function renderSummary(data: RollupData, period: RollupPeriod): string {
  if (data.sheetCount === 0) return `No daily sheets this ${period.noun}`;
  return `${data.done.length} done · ${data.open.length} open · ${data.blocked.length} blocked`;
}

// Weekly: one `### #tag` list per group. Monthly and up: one folded callout
// per group with the item count in its title, so a longer period stays readable.
function renderDone(period: RollupPeriod, data: RollupData): string {
  const groups = groupDone(data.done).map(({ tag, items }) => {
    const label = tag === null ? OTHER : `#${tag}`;
    const lines = items.map((item) => itemLine(item, { omitTag: tag, details: false }));
    if (period.kind !== "week") {
      return [`> [!success]- ${label} · ${items.length}`, ...lines.map((line) => `> ${line}`)].join("\n");
    }
    return `### ${label}\n${lines.join("\n")}`;
  });
  return groups.length ? `## Done\n\n${groups.join("\n\n")}` : "## Done";
}

const CHILD_NOTES_HEADING: Record<RollupPeriod["kind"], string> = {
  week: "",
  month: "## Weekly notes",
  quarter: "## Monthly notes",
  year: "## Quarterly notes",
};

function renderChildNotes(heading: string, childNotes: ChildNotes[]): string {
  const children = childNotes
    .filter((child) => child.notes.trim())
    .map((child) => `### ${child.label} · [[${child.name}]]\n${child.notes}`);
  return children.length ? `${heading}\n\n${children.join("\n\n")}` : heading;
}

// The lines between the markers (no trailing newline). Sections are
// separated by a blank line; an empty section is its heading and a blank line.
export function renderGeneratedBody(period: RollupPeriod, data: RollupData, childNotes: ChildNotes[] = []): string {
  const blocks = [
    renderSummary(data, period),
    renderDone(period, data),
    section("## Blocked", data.blocked.map((item) => itemLine(item, { details: true }))),
    section("## Still open", data.open.map((item) => itemLine(item, { details: true }))),
  ];
  let lastEmpty = data.open.length === 0;
  if (period.kind !== "week") {
    blocks.push(renderChildNotes(CHILD_NOTES_HEADING[period.kind], childNotes));
    lastEmpty = !childNotes.some((child) => child.notes.trim());
  }
  const body = blocks.join("\n\n");
  // An empty last section still gets its blank line before rollup:end.
  return lastEmpty ? `${body}\n` : body;
}

// A new sheet: heading, the generated region, then the user's `## Notes`
// with the caret on the blank line under it. A sheet built from a sensitive
// note starts with `sensitive: true` frontmatter.
export function renderNewSheet(period: RollupPeriod, body: string, sensitive: boolean): { text: string; cursor: number } {
  const frontmatter = sensitive ? "---\nsensitive: true\n---\n\n" : "";
  const text = `${frontmatter}# ${period.heading}\n\n${ROLLUP_START}\n${body}\n${ROLLUP_END}\n\n## Notes\n\n`;
  return { text, cursor: text.length - 1 };
}
