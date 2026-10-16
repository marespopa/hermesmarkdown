import { indexNoteContent, markContentIndexed, needsContentIndex } from "@/app/services/content-search-client";
import { loadMetadataCache, saveMetadataCache } from "@/app/services/metadata-cache";
import { collectVaultFiles, readFilesForIndexing } from "./vault-scan";
import { parseWithWorker, reportCollectProblems, startVaultIndex, type VaultIndexDeps } from "./vault-index";

interface RunVaultIndexOptions {
  worker: Worker;
  root: FileSystemDirectoryHandle;
  includeHidden: boolean;
  /** A fresh vault open (replaces the old vault's entries) rather than a re-index. */
  fresh: boolean;
  vaultKey: string | null;
  setMetadata: VaultIndexDeps["setMetadata"];
  setFolderPaths: (folders: string[]) => void;
  isCurrent: () => boolean;
}

// One streaming indexing run with the metadata worker: the walk hands each
// folder's notes to the indexer as it lists them, so notes are dated, matched
// against the cache and shown before the walk is over; parsing (newest first)
// and the note-text backfill follow (see vault-index.ts). Null when a newer
// run took over during the walk.
export async function runVaultIndex({
  worker, root, includeHidden, fresh, vaultKey, setMetadata, setFolderPaths, isCurrent,
}: RunVaultIndexOptions) {
  const indexer = startVaultIndex(fresh, {
    loadCache: () => (vaultKey ? loadMetadataCache(vaultKey) : Promise.resolve(null)),
    saveCache: (entries) => (vaultKey ? saveMetadataCache(vaultKey, entries) : Promise.resolve()),
    read: readFilesForIndexing,
    // The worker also indexes the text of every note it parses.
    parse: (files) => {
      markContentIndexed(files);
      return parseWithWorker(worker, files);
    },
    setMetadata,
    isCurrent,
    needsContent: needsContentIndex,
    indexContent: indexNoteContent,
  });
  const { files, folders, failedSubdirs, timedOut } = await collectVaultFiles(root, includeHidden, undefined, indexer.add);
  reportCollectProblems(timedOut, failedSubdirs);
  if (!isCurrent()) return null;
  setFolderPaths(folders);
  return indexer.complete(files);
}
