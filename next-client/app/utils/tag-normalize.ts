// A tag as the vault index keys it: trimmed, without surrounding quotes or a
// leading `#`, lowercase (`"#Release"` → `release`). Nested tags keep their
// slashes (`project/alpha`). Shared by the metadata worker's parser and the
// main thread (pinned tags), so neither imports the other's modules.
export function normalizeTag(tag: string): string {
  return tag.trim().replace(/^["']|["']$/g, "").replace(/^#/, "").toLowerCase();
}

// A tag and every tag above it, outermost first: `project/alpha/2026` gives
// ["project", "project/alpha", "project/alpha/2026"]. The sidebar's tag tree
// (atoms/tag-index-atoms.ts) files a note under each of them, so a parent's
// count includes its children's notes.
export function tagAncestry(tag: string): string[] {
  const parts = normalizeTag(tag).split("/").filter(Boolean);
  return parts.map((_, index) => parts.slice(0, index + 1).join("/"));
}
