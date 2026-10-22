import type { FileMetadata } from "@/app/atoms/metadata";

export interface LinkResolver {
  resolve(target: string, fromPath?: string | null): FileMetadata | null;
}

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

// Builds lookup maps once so many links resolve in O(1) each. Rules: strip a
// trailing `|alias`, exact case-insensitive vault path, then path relative to
// the linking note's folder (only for names holding a `/`), then basename
// match; basename ties go to the note closest to `fromPath` in the tree (same
// folder first), then the shortest path, then alphabetical.
export function createLinkResolver(fileMetadata: Record<string, FileMetadata>): LinkResolver {
  const byPath = new Map<string, FileMetadata>();
  const byName = new Map<string, FileMetadata[]>();
  for (const meta of Object.values(fileMetadata)) {
    const pathKey = meta.path.toLowerCase();
    if (!byPath.has(pathKey)) byPath.set(pathKey, meta);
    const nameKey = meta.name.toLowerCase();
    const list = byName.get(nameKey);
    if (list) list.push(meta);
    else byName.set(nameKey, [meta]);
  }

  return {
    resolve(name, fromPath) {
      const cleanName = name.split("|")[0].trim();
      const fileName = cleanName.endsWith(".md") ? cleanName : cleanName + ".md";
      const fromFolder = fromPath ? folderOf(fromPath) : "";

      const exact = byPath.get(fileName.toLowerCase());
      if (exact) return exact;

      if (fromFolder && cleanName.includes("/")) {
        const relative = byPath.get((fromFolder + "/" + fileName).toLowerCase());
        if (relative) return relative;
      }

      const nameOnly = (cleanName.split("/").pop() || "").toLowerCase();
      const nameKey = nameOnly.endsWith(".md") ? nameOnly : nameOnly + ".md";
      const candidates = byName.get(nameKey) ?? [];
      if (candidates.length <= 1) return candidates[0] ?? null;

      const rank = (meta: FileMetadata) => folderDistance(fromFolder, folderOf(meta.path));
      return [...candidates].sort(
        (a, b) =>
          rank(a) - rank(b) ||
          a.path.split("/").length - b.path.split("/").length ||
          a.path.localeCompare(b.path),
      )[0];
    },
  };
}
