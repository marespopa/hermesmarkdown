"use client";

import React, { useCallback, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { TbPinned } from "react-icons/tb";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_pinnedNotePaths, atom_toggleNotePin } from "@/app/atoms/note-pin-atoms";
import { atom_noteDisplayItems } from "@/app/atoms/privacy-atoms";
import Button from "@/app/components/Button";
import { useFileSystem } from "@/app/hooks/use-file-system";
import TabContextMenu from "../TabContextMenu";
import VaultFileTree from "../VaultFileTree";
import { fileCreateActions } from "../vault-tree/file-create-actions";
import type { VaultFileTreeController } from "../vault-tree/tree-model";
import SidebarSection from "./SidebarSection";
import { SIDEBAR_ICON_CLASS, sidebarItemClass } from "./sidebar-classes";

interface SidebarFilesProps {
  treeController: React.MutableRefObject<VaultFileTreeController | null>;
  activeFilePath: string | null;
  openHandle: (handle: FileSystemFileHandle, path?: string) => void;
  allFiles: any[];
  folderPaths: string[];
}

// The vault's files: its pinned notes first (the app's one set of pins,
// note-pin-atoms.ts, also first in the command palette; a note's right-click
// menu, in the tree or in the pinned list, has Pin / Unpin), then the
// tree (drag to move, F2 — Return on macOS — to rename, right-click for
// actions, arrow keys to move through it). Pinned titles go through
// atom_noteDisplayItems, so Privacy Mode applies.
export default function SidebarFiles({ treeController, activeFilePath, openHandle, allFiles, folderPaths }: SidebarFilesProps) {
  const metadata = useAtomValue(atom_fileMetadata);
  const displayItems = useAtomValue(atom_noteDisplayItems);
  const pinnedNotePaths = useAtomValue(atom_pinnedNotePaths);
  const toggleNotePin = useSetAtom(atom_toggleNotePin);
  const pinned = pinnedNotePaths.filter((path) => displayItems.has(path) && metadata[path]?.handle);
  const [pinMenu, setPinMenu] = useState<{ x: number; y: number; path: string } | null>(null);
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
      {pinned.length > 0 && (
        <div role="list" aria-label="Pinned notes" className="flex flex-col gap-px pb-1.5 mb-1.5 border-b border-edge-subtle">
          {pinned.map((path) => (
            <Button
              key={path}
              role="listitem"
              variant="unstyled"
              onClick={() => void openHandle(metadata[path].handle as FileSystemFileHandle, path)}
              onContextMenu={(event) => {
                event.preventDefault();
                setPinMenu({ x: event.clientX, y: event.clientY, path });
              }}
              aria-current={path === activeFilePath ? "page" : undefined}
              title={displayItems.get(path)!.isPrivate ? undefined : path}
              className={`w-full ${sidebarItemClass(path === activeFilePath)}`}
            >
              <TbPinned size={15} aria-hidden="true" className={SIDEBAR_ICON_CLASS} />
              <span className="flex-1 min-w-0 truncate">{displayItems.get(path)!.title}</span>
            </Button>
          ))}
        </div>
      )}
      {pinMenu && (
        <TabContextMenu
          x={pinMenu.x}
          y={pinMenu.y}
          label="Pinned note actions"
          onClose={() => setPinMenu(null)}
          items={[{ label: "Unpin", icon: <TbPinned size={15} />, onClick: () => toggleNotePin(pinMenu.path) }]}
        />
      )}
      <VaultFileTree
        processedFiles={allFiles}
        activeFilePath={activeFilePath}
        openFile={(handle, path) => void openHandle(handle, path)}
        renameFile={renameFile}
        deleteFile={deleteFile}
        trashItems={trashItems}
        duplicateFile={duplicateFile}
        undoFileOperation={undoFileOperation}
        controllerRef={treeController}
        isSearchActive={false}
        highlightQuery=""
        treeView
        singleClickOpen
        folderPaths={folderPaths}
        resolveFolderHandle={resolveFolderHandle}
        createNewFile={createNewFile}
        createFolder={createFolder}
        moveItem={moveItem}
        moveItems={moveItems}
        isPinned={(path) => pinnedNotePaths.includes(path)}
        togglePin={toggleNotePin}
      />
    </SidebarSection>
  );
}
