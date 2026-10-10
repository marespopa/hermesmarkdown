// Quick jot: one line appended to the end of today's sheet.

// A list item (`- `, `* `, `+ `, optionally with a `[ ]` checkbox) or an
// ordered item (`1. `, `2) `). Text starting with one is kept as typed.
const LIST_MARKER = /^(?:[-*+] (?:\[.\] )?|\d+[.)] )/;

// "14:20": 24-hour local time.
export function jotTime(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

// The line to append for `text`, or null when there's nothing to add.
// Newlines are joined into one line; plain text becomes `- text`. With
// `time`, `HH:MM ` goes after the list marker and checkbox.
export function formatJotLine(text: string, time?: Date | null): string | null {
  const flat = text.replace(/\s*\r?\n\s*/g, " ").trim();
  if (!flat) return null;
  const match = flat.match(LIST_MARKER);
  const marker = match ? match[0] : "- ";
  const body = match ? flat.slice(marker.length) : flat;
  return `${marker}${time ? `${jotTime(time)} ` : ""}${body}`;
}

// `content` with `line` on its own line at the very end. Existing text is
// never changed; the newline style follows the file.
export function appendJotLine(content: string, line: string): string {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  if (!content.trim()) return `${line}${eol}`;
  const sep = content.endsWith("\n") ? "" : eol;
  return `${content}${sep}${line}${eol}`;
}
