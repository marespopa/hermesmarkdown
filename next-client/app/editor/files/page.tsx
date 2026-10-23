"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAtom, useAtomValue } from "jotai";
import Button from "@/app/components/Button";
import { atom_activeFilePath } from "@/app/atoms/atoms";
import { atom_vaultName } from "@/app/atoms/vault-atoms";
import { atom_selectedFileTags } from "@/app/atoms/ui-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useVaultSync } from "@/app/hooks/use-vault-sync";
import { useVaultFileSearch } from "../hooks/useVaultFileSearch";
import VaultFileTree from "../components/VaultFileTree";
import UnifiedSearchInput from "../components/UnifiedSearchInput";
import { fileCreateActions } from "../components/vault-tree/file-create-actions";
import type { VaultFileTreeController } from "../components/vault-tree/tree-model";
import { formatCount } from "@/app/components/CountBadge";
import ShellPage from "../components/ShellPage";
import { editorFileHref } from "../utils/editor-url";

export default function FilesPage() {
  const router = useRouter();
  const [activeFilePath, setActiveFilePath] = useAtom(atom_activeFilePath);
  const [selectedTags, setSelectedTags] = useAtom(atom_selectedFileTags);
  const {
    createNewFile,
    createFolder,
    deleteFile,
    trashItems,
    duplicateFile,
    isMounted,
    moveItem,
    moveItems,
    undoFileOperation,
    openFile,
    renameFile,
    vaultHandle,
  } = useFileSystem();
  const vaultName = useAtomValue(atom_vaultName);
  // No Refresh button: the list follows the disk (watched where the browser
  // can, and rescanned on focus and on a timer everywhere).
  useVaultSync();
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

  const treeController = useRef<VaultFileTreeController | null>(null);

  const resolveFolderHandle = useCallback(async (path: string): Promise<FileSystemDirectoryHandle | null> => {
    if (!vaultHandle) return null;
    if (!path) return vaultHandle;
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

  // Named in place in the tree, in the selected folder (or the selected
  // note's folder, else the root). While a search filters the list, the
  // folder picker and name prompt are used instead.
  const startCreate = useCallback((kind: "file" | "folder") => {
    if (treeController.current && !isFiltered) {
      treeController.current.startCreate(kind);
      return;
    }
    void (kind === "file" ? createNewFile() : createFolder());
  }, [isFiltered, createNewFile, createFolder]);

  const createActions = fileCreateActions({
    newNote: () => startCreate("file"),
    newFolder: () => startCreate("folder"),
  });

  const openSelectedFile = useCallback((handle: FileSystemFileHandle, path?: string) => {
    void openFile(handle, path);
    setActiveFilePath(path ?? handle.name);
    router.push(editorFileHref(path ?? handle.name));
  }, [openFile, router, setActiveFilePath]);

  if (!isMounted) return null;

  return (
    <ShellPage title="All Notes">
      <main className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-4 py-5 sm:px-8">
        <div className="mb-5 flex shrink-0 items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-ui-title-3 font-semibold">All Notes</h1>
            <p className="truncate text-ui-caption text-stone">{vaultName ?? "No vault open"}</p>
          </div>
        {vaultHandle && (
          <div className="flex shrink-0 items-center gap-1">
            {createActions.map((action) => (
              <Button
                key={action.id}
                variant="secondary"
                onClick={action.onSelect}
                className="h-8 px-2.5 text-ui-footnote"
                aria-label={action.label}
                title={action.label}
              >
                {action.icon}
                <span className="hidden sm:inline">{action.label}</span>
              </Button>
            ))}
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
                  ? formatCount(totalResultsCount, ["matching note", "matching notes"])
                  : `${formatCount(allFiles.length, ["note", "notes"])}, ${formatCount(folderPaths.length, ["folder", "folders"])}`}
              </p>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-edge-subtle bg-surface">
              <VaultFileTree
                processedFiles={isFiltered ? processedFiles : allFiles}
                activeFilePath={activeFilePath}
                openFile={openSelectedFile}
                renameFile={renameFile}
                deleteFile={deleteFile}
                trashItems={trashItems}
                duplicateFile={duplicateFile}
                undoFileOperation={undoFileOperation}
                controllerRef={treeController}
                treeView
                columns
                folderPaths={isFiltered ? [] : folderPaths}
                resolveFolderHandle={resolveFolderHandle}
                createNewFile={createNewFile}
                createFolder={createFolder}
                moveItem={moveItem}
                moveItems={moveItems}
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
    </ShellPage>
  );
}
