// A tag as the vault index keys it: trimmed, without surrounding quotes or a
// leading `#`, lowercase (`"#Release"` → `release`). Nested tags keep their
// slashes (`project/alpha`). Shared by the metadata worker's parser and the
// main thread (pinned tags), so neither imports the other's modules.
export function normalizeTag(tag: string): string {
  return tag.trim().replace(/^["']|["']$/g, "").replace(/^#/, "").toLowerCase();
}
