import type { FileMetadata } from "@/app/atoms/metadata";

// Resolves a `[[WikiLink]]`-style name to a file entry: strips a trailing
// `|alias`, tries an exact case-insensitive path match, then falls back to a
// fuzzy match on basename only. Shared by note navigation (openFileByName)
// and cross-file formula references (useCrossFileTables) so both agree on
// what a given name resolves to.
export function resolveFileMetaByName(
  name: string,
  fileMetadata: Record<string, FileMetadata>,
): FileMetadata | null {
  const cleanName = name.split("|")[0].trim();
  const fileName = cleanName.endsWith(".md") ? cleanName : `${cleanName}.md`;

  const exactMatch = Object.values(fileMetadata).find(
    (meta) => meta.path.toLowerCase() === fileName.toLowerCase(),
  );
  if (exactMatch) return exactMatch;

  const nameOnly = cleanName.split("/").pop() || "";
  const nameOnlyWithExt = nameOnly.endsWith(".md") ? nameOnly.toLowerCase() : `${nameOnly.toLowerCase()}.md`;

  const fuzzyMatch = Object.values(fileMetadata).find((meta) => meta.name.toLowerCase() === nameOnlyWithExt);
  return fuzzyMatch ?? null;
}
