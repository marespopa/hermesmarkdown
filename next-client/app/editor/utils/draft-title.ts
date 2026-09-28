// Names a draft when it's first saved to the vault: the first line of text
// (Markdown syntax stripped, filename-safe, capped), or a date stamp when the
// first line has nothing usable. Pure, so it can be unit-tested alone.

import { stripMarkdownLine } from "@/app/utils/markdown-preview";

const MAX_TITLE_LENGTH = 60;

// Lines after a leading YAML frontmatter block, or every line if there's none.
function bodyLines(content: string): string[] {
  const lines = content.split("\n");
  if (lines[0]?.trim() !== "---") return lines;
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  return end === -1 ? [] : lines.slice(end + 1);
}

function firstLineIndex(lines: string[]): number {
  return lines.findIndex((line) => line.trim().length > 0);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

// `YYYY-MM-DD HHmm` in local time, e.g. `2026-09-28 1432`.
export function dateStamp(now: Date): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function cleanTitle(line: string): string {
  let title = stripMarkdownLine(line)
    // Illegal on common file systems, or meaningful inside [[wikilinks]].
    .replace(/[\\/:*?"<>|#^[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    // A leading dot would hide the file.
    .replace(/^\.+/, "")
    .trim();

  if (title.length > MAX_TITLE_LENGTH) {
    const cut = title.slice(0, MAX_TITLE_LENGTH);
    const lastSpace = cut.lastIndexOf(" ");
    title = lastSpace > MAX_TITLE_LENGTH / 2 ? cut.slice(0, lastSpace) : cut;
  }
  // Windows rejects names ending in a dot or space.
  return title.replace(/[.\s]+$/, "");
}

export function draftTitle(content: string, now: Date): string {
  const lines = bodyLines(content);
  const index = firstLineIndex(lines);
  const title = index === -1 ? "" : cleanTitle(lines[index]);
  return title || dateStamp(now);
}

// True once the writer has moved past the first line, so autosave doesn't name
// the file after a half-typed title (e.g. `Meeting wi.md`).
export function isDraftTitleSettled(content: string): boolean {
  const lines = bodyLines(content);
  const index = firstLineIndex(lines);
  return index !== -1 && index < lines.length - 1;
}
