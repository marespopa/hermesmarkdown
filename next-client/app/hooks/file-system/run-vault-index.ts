import { indexNoteContent, markContentIndexed, needsContentIndex } from "@/app/services/content-search-client";
import { loadMetadataCache, saveMetadataCache } from "@/app/services/metadata-cache";
import { collectVaultFiles, readFilesForIndexing, type CollectedFile } from "./vault-scan";
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
  setTextFiles: (files: CollectedFile[]) => void;
  isCurrent: () => boolean;
}

// How often text files found by the walk are published while it runs.
const TEXT_FLUSH_MS = 150;

// One streaming indexing run with the metadata worker: the walk hands each
// folder's notes to the indexer as it lists them, so notes are dated, matched
// against the cache and shown before the walk is over; parsing (newest first)
// and the note-text backfill follow (see vault-index.ts). Resolves once
// every note is listed and removed ones are gone; null when a newer run took
// over during the walk.
export async function runVaultIndex({
  worker, root, includeHidden, fresh, vaultKey, setMetadata, setFolderPaths, setTextFiles, isCurrent,
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
  // A vault just opened has no text files listed yet: they stream in with the
  // walk, as notes do, so code files show up with the notes rather than once
  // the whole tree is walked. Published at most every TEXT_FLUSH_MS (one
  // render per batch). A re-index keeps the list it has until the walk is
  // over, so nothing listed blinks out meanwhile.
  const streamed: CollectedFile[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  const flush = () => {
    flushTimer = null;
    if (isCurrent()) setTextFiles(streamed.slice());
  };
  const onTextFiles = fresh
    ? (found: CollectedFile[]) => {
        streamed.push(...found);
        flushTimer ??= setTimeout(flush, TEXT_FLUSH_MS);
      }
    : undefined;
  const { files, folders, textFiles, failedSubdirs, timedOut } = await collectVaultFiles(root, includeHidden, undefined, indexer.add, onTextFiles);
  if (flushTimer) clearTimeout(flushTimer);
  reportCollectProblems(timedOut, failedSubdirs);
  if (!isCurrent()) return null;
  setFolderPaths(folders);
  setTextFiles(textFiles);
  const run = indexer.complete(files);
  await run.listed;
  return run;
}
