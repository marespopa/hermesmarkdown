"use client";

import React, { useCallback, useMemo, useState } from "react";
import BareInput from "@/app/components/Input/BareInput";
import { FIELD_COMPACT_CLASS } from "@/app/components/Input/field-styles";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { usePins } from "@/app/hooks/use-pins";
import VaultFileTree from "../VaultFileTree";
import { fileCreateActions } from "../vault-tree/file-create-actions";
import { getEntryPath, type VaultFileTreeController } from "../vault-tree/tree-model";
import { compileFilesFilter, filterVault } from "./files-filter";
import SidebarSection from "./SidebarSection";

interface SidebarFilesProps {
  treeController: React.MutableRefObject<VaultFileTreeController | null>;
  activeFilePath: string | null;
  openHandle: (handle: FileSystemFileHandle, path?: string) => void;
  allFiles: any[];
  folderPaths: string[];
}

// The vault's files as a tree (drag to move, F2 — Return on macOS — to
// rename, right-click for actions, arrow keys to move through it). A note's
// or folder's right-click menu has Pin / Unpin, which adds it to (or removes
// it from) the vault's pins (usePins, `.hermes/pins.yaml`), listed in the
// sidebar's Pinned section. A filter box above the tree narrows it to the
// files whose vault path matches a regular expression (files-filter.ts), with
// every folder around them open; Escape clears it, ↓ or Enter moves into the tree.
export default function SidebarFiles({ treeController, activeFilePath, openHandle, allFiles, folderPaths }: SidebarFilesProps) {
  const { isPinned, togglePin } = usePins();
  const [query, setQuery] = useState("");
  const filter = useMemo(() => compileFilesFilter(query), [query]);
  const shown = useMemo(
    () => (filter ? filterVault(allFiles, folderPaths, filter, (file) => getEntryPath(file) ?? file.name) : { files: allFiles, folderPaths }),
    [filter, allFiles, folderPaths],
  );
  const {
    vaultHandle, renameFile, deleteFile, trashItems, duplicateFile, moveItem, moveItems,
    createNewFile, createFolder, undoFileOperation,
  } = useFileSystem();

  const resolveFolderHandle = useCallback(async (path: string): Promise<any | null> => {
    if (!path) return vaultHandle;
    if (!vaultHandle) return null;
    let dir: any = vaultHandle;
    for (const segment of path.split("/")) {
      try {
        dir = await dir.getDirectoryHandle(segment);
      } catch {
        return null;
      }
    }
    return dir;
  }, [vaultHandle]);

  // The tree shows no root row, so the Files ⋯ menu creates at the vault's
  // root, named in place in the tree; a folder's own menu creates inside it.
  const createAtRoot = (kind: "file" | "folder") => {
    if (treeController.current) {
      treeController.current.startCreate(kind, "");
      return;
    }
    const create = kind === "file" ? createNewFile : createFolder;
    if (vaultHandle) void create(vaultHandle);
  };

  return (
    <SidebarSection
      title="Files"
      menu={fileCreateActions({
        newNote: () => createAtRoot("file"),
        newFolder: () => createAtRoot("folder"),
      })}
    >
      <BareInput
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && query) {
            // Clears the filter; a second Escape reaches the sidebar and hides it.
            event.preventDefault();
            event.stopPropagation();
            setQuery("");
          } else if (event.key === "ArrowDown" || event.key === "Enter") {
            event.preventDefault();
            treeController.current?.focus();
          }
        }}
        placeholder="Filter"
        aria-label="Filter files"
        aria-invalid={filter && !filter.valid ? true : undefined}
        title={filter && !filter.valid ? "Not a valid pattern: matching the text as typed" : "Filter by path (a regular expression)"}
        spellCheck={false}
        className={`${FIELD_COMPACT_CLASS} mb-1`}
      />
      <VaultFileTree
        processedFiles={shown.files}
        activeFilePath={activeFilePath}
        openFile={(handle, path) => void openHandle(handle, path)}
        renameFile={renameFile}
        deleteFile={deleteFile}
        trashItems={trashItems}
        duplicateFile={duplicateFile}
        undoFileOperation={undoFileOperation}
        controllerRef={treeController}
        isSearchActive={!!filter}
        highlightQuery=""
        treeView
        expandAll={!!filter}
        singleClickOpen
        folderPaths={shown.folderPaths}
        resolveFolderHandle={resolveFolderHandle}
        createNewFile={createNewFile}
        createFolder={createFolder}
        moveItem={moveItem}
        moveItems={moveItems}
        isPinned={(path, kind) => isPinned(kind === "folder" ? "folder" : "note", path)}
        togglePin={(path, kind) => void togglePin(kind === "folder" ? "folder" : "note", path)}
      />
    </SidebarSection>
  );
}
