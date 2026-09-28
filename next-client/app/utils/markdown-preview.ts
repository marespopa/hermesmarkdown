// Plain-text views of Markdown for names and previews: draft titles
// (app/editor/utils/draft-title.ts) and the home feed's note previews, which
// the metadata worker computes. Pure and dependency-free, so the worker can
// import it.

const REGEX_FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---[^\n]*(\r?\n|$)/;

export function stripFrontmatter(content: string): string {
  return content.replace(REGEX_FRONTMATTER, "");
}

// Removes a single line's block markers (heading, quote, list, task) and
// inline syntax (emphasis, code, links, wikilinks, images), keeping the text.
export function stripMarkdownLine(line: string): string {
  return line
    .trim()
    .replace(/^#{1,6}\s+/, "")
    .replace(/^(>\s*)+/, "")
    .replace(/^([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?/, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target: string, alias?: string) => alias ?? target)
    .replace(/==|[*~`]/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

const PREVIEW_MAX_CHARS = 240;

// A few lines of body text for a note list: frontmatter, a leading heading
// (the title, shown separately), code fences, tables, rules and HTML
// comments are skipped; the rest is stripped and joined into one paragraph.
export function notePreview(content: string, maxChars = PREVIEW_MAX_CHARS): string {
  const lines = stripFrontmatter(content).replace(/<!--[\s\S]*?-->/g, "").split(/\r?\n/);
  const parts: string[] = [];
  let length = 0;
  let inFence = false;
  let sawText = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (/^(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence || !line) continue;
    if (!sawText && /^#{1,6}\s/.test(line)) {
      sawText = true;
      continue;
    }
    sawText = true;
    if (/^\|.*\|$/.test(line) || /^([-*_]\s*){3,}$/.test(line)) continue;

    const text = stripMarkdownLine(line);
    if (!text) continue;
    parts.push(text);
    length += text.length + 1;
    if (length >= maxChars) break;
  }

  const preview = parts.join(" ");
  if (preview.length <= maxChars) return preview;
  const cut = preview.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxChars / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
