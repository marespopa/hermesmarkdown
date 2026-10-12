// Lines added to the end of today's sheet (AI Chat's add_to_today).

// A list item (`- `, `* `, `+ `, optionally with a `[ ]` checkbox) or an
// ordered item (`1. `, `2) `). Text starting with one is kept as typed.
const LIST_MARKER = /^(?:[-*+] (?:\[.\] )?|\d+[.)] )/;

// The line to append for `text`, or null when there's nothing to add.
// Newlines are joined into one line; plain text becomes `- text`.
export function formatTodayLine(text: string): string | null {
  const flat = text.replace(/\s*\r?\n\s*/g, " ").trim();
  if (!flat) return null;
  return LIST_MARKER.test(flat) ? flat : `- ${flat}`;
}

// `content` with `line` on its own line at the very end. Existing text is
// never changed; the newline style follows the file.
export function appendTodayLine(content: string, line: string): string {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  if (!content.trim()) return `${line}${eol}`;
  const sep = content.endsWith("\n") ? "" : eol;
  return `${content}${sep}${line}${eol}`;
}
