import type { FileMetadata } from "@/app/atoms/metadata";

function folderOf(path: string): string {
  return path.split("/").slice(0, -1).join("/");
}

// Path segments walked to get from folder `a` to folder `b` in the tree.
function folderDistance(a: string, b: string): number {
  const aParts = a ? a.split("/") : [];
  const bParts = b ? b.split("/") : [];
  let shared = 0;
  while (shared < aParts.length && shared < bParts.length && aParts[shared] === bParts[shared]) {
    shared++;
  }
  return aParts.length - shared + (bParts.length - shared);
}

// Resolves a `[[WikiLink]]`-style name to a file entry: strips a trailing
// `|alias`, tries an exact case-insensitive path match (vault-relative, then
// relative to the linking note's folder), then falls back to a basename
// match. With nested folders several notes can share a basename; the one
// closest to `fromPath` in the tree wins (same folder first), then the
// shortest path, then alphabetical order — so the result never depends on
// metadata insertion order. Shared by note navigation (openFileByName) and
// cross-file formula references (useCrossFileTables) so both agree on what a
// given name resolves to.
export function resolveFileMetaByName(
  name: string,
  fileMetadata: Record<string, FileMetadata>,
  fromPath?: string | null,
): FileMetadata | null {
  const cleanName = name.split("|")[0].trim();
  const fileName = cleanName.endsWith(".md") ? cleanName : `${cleanName}.md`;
  const all = Object.values(fileMetadata);
  const fromFolder = fromPath ? folderOf(fromPath) : "";

  const byPath = (target: string) =>
    all.find((meta) => meta.path.toLowerCase() === target.toLowerCase()) ?? null;

  const exactMatch = byPath(fileName);
  if (exactMatch) return exactMatch;

  if (fromFolder && cleanName.includes("/")) {
    const relativeMatch = byPath(`${fromFolder}/${fileName}`);
    if (relativeMatch) return relativeMatch;
  }

  const nameOnly = cleanName.split("/").pop() || "";
  const nameOnlyWithExt = nameOnly.endsWith(".md") ? nameOnly.toLowerCase() : `${nameOnly.toLowerCase()}.md`;

  const candidates = all.filter((meta) => meta.name.toLowerCase() === nameOnlyWithExt);
  if (candidates.length <= 1) return candidates[0] ?? null;

  const rank = (meta: FileMetadata) => folderDistance(fromFolder, folderOf(meta.path));
  return [...candidates].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      a.path.split("/").length - b.path.split("/").length ||
      a.path.localeCompare(b.path),
  )[0];
}
