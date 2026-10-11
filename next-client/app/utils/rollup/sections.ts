// The marked generated region of a rollup sheet: replacing it (Refresh
// rollup) and reading a weekly sheet's own Notes (for its month's sheet).

import { REGEX_ROLLUP_END, REGEX_ROLLUP_START } from "./render";

const REGEX_NOTES_HEADING = /^##\s+notes\s*$/i;
// The next `# ` or `## ` heading ends the Notes section.
const REGEX_SECTION_END = /^##? /;

// Replaces everything between the first rollup:start line and the first
// rollup:end line after it with `body` (lines, no trailing newline). The
// marker lines and every byte outside them are kept; the body takes the
// file's line endings. Null when the markers are missing or out of order.
export function spliceGenerated(content: string, body: string): string | null {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  let afterStart = -1;
  let pos = 0;
  while (pos < content.length) {
    const newline = content.indexOf("\n", pos);
    const lineEnd = newline === -1 ? content.length : newline;
    const line = content.slice(pos, lineEnd);
    if (afterStart === -1) {
      if (REGEX_ROLLUP_START.test(line)) {
        if (newline === -1) return null;
        afterStart = newline + 1;
      }
    } else if (REGEX_ROLLUP_END.test(line)) {
      return content.slice(0, afterStart) + body.split("\n").join(eol) + eol + content.slice(pos);
    }
    if (newline === -1) break;
    pos = newline + 1;
  }
  return null;
}

// A weekly sheet's Notes text: the lines under the first `## Notes` heading
// after rollup:end (anywhere when there's no end marker), up to the next
// `# ` / `## ` heading or the end of the file, blank lines at either end
// trimmed. "" when there's no Notes heading.
export function extractNotes(content: string): string {
  const lines = content.split(/\r?\n/);
  const end = lines.findIndex((line) => REGEX_ROLLUP_END.test(line));
  const heading = lines.findIndex((line, i) => i > end && REGEX_NOTES_HEADING.test(line));
  if (heading === -1) return "";
  const notes: string[] = [];
  for (const line of lines.slice(heading + 1)) {
    if (REGEX_SECTION_END.test(line)) break;
    notes.push(line);
  }
  while (notes.length && !notes[0].trim()) notes.shift();
  while (notes.length && !notes[notes.length - 1].trim()) notes.pop();
  return notes.join("\n");
}
