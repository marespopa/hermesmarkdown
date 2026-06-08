// app/utils/frontmatterInjector.ts

const REGEX_FRONTMATTER = /^---\n[\s\S]*?\n---/;
const REGEX_TAG = /(?<=^|\s)#(?=[a-zA-Z0-9_\-/]*[a-zA-Z])([a-zA-Z0-9_\-/]+)/g;

function toSlug(fileName: string): string {
  return fileName
    .replace(/\.md$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toTitle(fileName: string): string {
  return fileName.replace(/\.md$/i, "");
}

/**
 * Prepends a standard frontmatter block to content if none exists.
 * Inline #tags are extracted and placed in the frontmatter tags array.
 * Returns the original content unchanged if frontmatter already exists.
 */
export function injectFrontmatter(content: string, fileName: string): string {
  if (REGEX_FRONTMATTER.test(content)) return content;

  const tagMatches = Array.from(content.matchAll(REGEX_TAG));
  const tags = Array.from(new Set(tagMatches.map((m) => m[1].toLowerCase())));
  const tagsStr = tags.length > 0 ? `[${tags.join(", ")}]` : "[]";

  const slug = toSlug(fileName);
  const title = toTitle(fileName);

  const fm = `---\nid: ${slug}\ntitle: ${title}\ntype: note\nstatus: "#draft"\nversion: 1\ntags: ${tagsStr}\n---\n\n`;
  return fm + content;
}
