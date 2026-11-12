import { REGEX_CODE_INLINE, REGEX_MENTION } from "@/app/editor/components/regex";

export interface NoteMention {
  /** `@Name`, as first typed. */
  label: string;
  /** How many times the note mentions it (ignoring case). */
  count: number;
  /** Document position of its first `@`. */
  from: number;
}

/** The part of a CodeMirror `Text` the scan reads. */
export interface MentionSource {
  lines: number;
  line(number: number): { text: string; from: number };
}

// The `@` scope's source: each distinct `@Name` in the note (ignoring case),
// in order of first appearance. Frontmatter, fenced code and inline code
// aren't read, so `@Override` in a code block is no mention; the same
// pattern the editor's pills use (REGEX_MENTION).
export function collectNoteMentions(doc: MentionSource): NoteMention[] {
  const found = new Map<string, NoteMention>();
  let inFence = false;
  let inFrontmatter = false;
  for (let number = 1; number <= doc.lines; number++) {
    const { text, from } = doc.line(number);
    if (number === 1 && /^---\s*$/.test(text)) { inFrontmatter = true; continue; }
    if (inFrontmatter) { if (/^---\s*$/.test(text)) inFrontmatter = false; continue; }
    if (/^\s*(```|~~~)/.test(text)) { inFence = !inFence; continue; }
    if (inFence || !text.includes("@")) continue;
    // Blank inline code spans (keeping the length) so positions still line up.
    const readable = text.replace(REGEX_CODE_INLINE, (span) => " ".repeat(span.length));
    for (const match of readable.matchAll(REGEX_MENTION)) {
      const label = match[2];
      const key = label.toLowerCase();
      const known = found.get(key);
      if (known) known.count += 1;
      else found.set(key, { label, count: 1, from: from + match.index! + match[1].length });
    }
  }
  return [...found.values()];
}
