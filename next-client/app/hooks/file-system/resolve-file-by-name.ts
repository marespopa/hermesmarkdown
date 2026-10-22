import type { FileMetadata } from "@/app/atoms/metadata";
import { createLinkResolver } from "@/app/utils/note-links/link-resolver";

// Resolves a `[[WikiLink]]`-style name to a file entry (rules live in
// utils/note-links/link-resolver.ts): strips `|alias`, exact vault path,
// path relative to the linking note's folder, then basename match with ties
// broken by tree distance from `fromPath`. Shared by note navigation
// (openFileByName) and cross-file formula references (useCrossFileTables) so
// both agree on what a given name resolves to.
export function resolveFileMetaByName(
  name: string,
  fileMetadata: Record<string, FileMetadata>,
  fromPath?: string | null,
): FileMetadata | null {
  return createLinkResolver(fileMetadata).resolve(name, fromPath);
}
