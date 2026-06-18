// app/utils/frontmatterInjector.ts

const REGEX_FRONTMATTER = /^---\n[\s\S]*?\n---/;
const REGEX_TAG = /(?<=^|\s)#(?=[a-zA-Z0-9_\-/]*[a-zA-Z])([a-zA-Z0-9_\-/]+)/g;

function toTitle(fileName: string): string {
  return fileName.replace(/\.md$/i, "");
}

export function injectFrontmatter(content: string, fileName: string): string {
  if (REGEX_FRONTMATTER.test(content)) return content;

  const tagMatches = Array.from(content.matchAll(REGEX_TAG));
  const tags = Array.from(new Set(tagMatches.map((m) => m[1].toLowerCase())));
  const tagsStr = tags.length > 0 ? `[${tags.join(", ")}]` : "[]";

  const title = toTitle(fileName);
  const fmLines = [
    "---",
    `title: "${title}"`,
    "status: draft",
    ...(tags.length > 0 ? [`tags: ${tagsStr}`] : []),
    "---",
    "",
    "",
  ];

  return fmLines.join("\n") + content;
}
