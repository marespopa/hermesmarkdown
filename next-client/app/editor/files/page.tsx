"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAtom, useAtomValue } from "jotai";
import { HiOutlineArrowLeft, HiOutlineDocumentAdd, HiOutlineFolderAdd, HiOutlineRefresh } from "react-icons/hi";
import Button from "@/app/components/Button";
import { atom_activeFilePath } from "@/app/atoms/atoms";
import { atom_indexerState, atom_selectedFileTags, atom_showHiddenFiles } from "@/app/atoms/ui-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useVaultFileSearch } from "../hooks/useVaultFileSearch";
import VaultFileTree from "../components/VaultFileTree";
import UnifiedSearchInput from "../components/UnifiedSearchInput";

export default function FilesPage() {
  const router = useRouter();
  const [activeFilePath, setActiveFilePath] = useAtom(atom_activeFilePath);
  const [selectedTags, setSelectedTags] = useAtom(atom_selectedFileTags);
  const {
    createNewFile,
    createFolder,
    deleteFile,
    duplicateFile,
    isMounted,
    moveItem,
    openFile,
    renameFile,
    scanVault,
    indexVaultTags,
    vaultHandle,
  } = useFileSystem();
  const showHiddenFiles = useAtomValue(atom_showHiddenFiles);
  const indexerState = useAtomValue(atom_indexerState);
  const isRefreshing = indexerState !== "idle";
  const {
    allFiles,
    folderPaths,
    processedFiles,
    totalResultsCount,
    hasMoreResults,
    searchQuery,
    setSearchQuery,
    setShowAllResults,
    tags,
  } = useVaultFileSearch({ selectedTags, panel: "files" });
  const isFiltered = selectedTags.length > 0 || searchQuery.trim().length > 0;

  const resolveFolderHandle = useCallback(async (path: string): Promise<FileSystemDirectoryHandle | null> => {
    if (!vaultHandle) return null;
    let directory = vaultHandle;
    for (const segment of path.split("/")) {
      try {
        directory = await directory.getDirectoryHandle(segment);
      } catch {
        return null;
      }
    }
    return directory;
  }, [vaultHandle]);

  // Re-reads the vault from disk (picks up changes made outside the app).
  const refresh = useCallback(() => {
    if (!vaultHandle) return;
    void scanVault(vaultHandle as any, showHiddenFiles);
    void indexVaultTags?.(vaultHandle as any, showHiddenFiles);
  }, [vaultHandle, showHiddenFiles, scanVault, indexVaultTags]);

  const createNote = useCallback(async () => {
    await createNewFile();
  }, [createNewFile]);

  const openSelectedFile = useCallback((handle: FileSystemFileHandle, path?: string) => {
    void openFile(handle, path);
    setActiveFilePath(path ?? handle.name);
    router.push("/editor");
  }, [openFile, router, setActiveFilePath]);

  if (!isMounted) return null;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden overscroll-none bg-paper-pale font-sans text-ink-light dark:bg-paper-dark dark:text-ink-dark">
      <header className="shrink-0 border-b border-beige/70 px-5 py-4 dark:border-paper-dark sm:px-8">
        <Button
          variant="bare"
          onClick={() => router.push("/editor")}
          className="group text-stone hover:text-ink-light dark:hover:text-ink-dark"
          aria-label="Back to editor"
        >
          <HiOutlineArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
          Editor
        </Button>
      </header>
      <main className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-4 py-5 sm:px-8">
        <div className="mb-5 flex shrink-0 items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-ui-title-3 font-semibold">Explorer</h1>
            <p className="truncate text-ui-caption text-stone">{vaultHandle?.name ?? "No vault open"}</p>
          </div>
        {vaultHandle && (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="secondary"
              onClick={refresh}
              isDisabled={isRefreshing}
              className="h-8 px-2.5 text-ui-footnote"
              aria-label="Refresh"
              title="Refresh"
            >
              <HiOutlineRefresh size={15} className={isRefreshing ? "animate-spin" : undefined} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="secondary" onClick={() => void createNote()} className="h-8 px-2.5 text-ui-footnote" aria-label="New note">
              <HiOutlineDocumentAdd size={15} />
              <span className="hidden sm:inline">New Note</span>
            </Button>
            <Button variant="secondary" onClick={() => void createFolder()} className="h-8 px-2.5 text-ui-footnote" aria-label="New folder">
              <HiOutlineFolderAdd size={15} />
              <span className="hidden sm:inline">New Folder</span>
            </Button>
          </div>
        )}
        </div>
        {vaultHandle ? (
          <>
            <div className="mb-3">
              <UnifiedSearchInput
                tokens={selectedTags}
                text={searchQuery}
                allTags={tags}
                onTokenAdd={(tag) => setSelectedTags((previous) => previous.includes(tag) ? previous : [...previous, tag])}
                onTokenRemove={(tag) => setSelectedTags((previous) => previous.filter((selectedTag) => selectedTag !== tag))}
                onTextChange={setSearchQuery}
                autoFocus={selectedTags.length > 0}
              />
            </div>
            <div className="mb-3 flex items-center justify-between gap-3 text-ui-footnote text-fg-muted">
              <p>
                {isFiltered
                  ? `${totalResultsCount} matching ${totalResultsCount === 1 ? "note" : "notes"}`
                  : `${allFiles.length} ${allFiles.length === 1 ? "note" : "notes"}, ${folderPaths.length} ${folderPaths.length === 1 ? "folder" : "folders"}`}
              </p>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-edge-subtle bg-surface">
              <VaultFileTree
                processedFiles={isFiltered ? processedFiles : allFiles}
                activeFilePath={activeFilePath}
                openFile={openSelectedFile}
                renameFile={renameFile}
                deleteFile={deleteFile}
                duplicateFile={duplicateFile}
                treeView
                columns
                folderPaths={isFiltered ? [] : folderPaths}
                resolveFolderHandle={resolveFolderHandle}
                createNewFile={createNewFile}
                createFolder={createFolder}
                moveItem={moveItem}
              />
              {isFiltered && hasMoreResults && (
                <Button variant="bare" onClick={() => setShowAllResults(true)} className="w-full py-2 text-ui-footnote text-fg-muted hover:text-fg">
                  Show all {totalResultsCount} notes
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-ui-footnote text-fg-muted">
            Open a vault from the editor to manage its files.
          </div>
        )}
      </main>
    </div>
  );
}
