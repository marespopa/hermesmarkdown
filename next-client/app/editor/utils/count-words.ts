// Words in a note as a reader would count them: frontmatter is left out, and
// so are tokens with no letter or digit in them — Markdown marks standing on
// their own (`#`, `-`, `>`, `|`, `---`), stray punctuation and emoji rules.
const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/;
const HAS_WORD_CHARACTER = /[\p{L}\p{N}]/u;

export function countWords(text: string): number {
  const body = text.replace(FRONTMATTER, "");
  let count = 0;
  for (const token of body.split(/\s+/)) {
    if (HAS_WORD_CHARACTER.test(token)) count++;
  }
  return count;
}
