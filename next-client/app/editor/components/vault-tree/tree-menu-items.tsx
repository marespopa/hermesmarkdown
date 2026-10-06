"use client";

import {
  HiOutlineDocumentAdd,
  HiOutlineDocumentText,
  HiOutlineDuplicate,
  HiOutlineFolderAdd,
  HiOutlineTemplate,
  HiOutlinePencil,
  HiOutlineTrash,
} from "react-icons/hi";
import { renameShortcut, trashShortcut, type TreeMenuItem } from "./TreeContextMenu";
import type { VaultFileTreeProps } from "./tree-model";
import type { MenuTarget, useTreeActions } from "./use-tree-actions";

const ICON = { size: 14, className: "opacity-80 shrink-0" };

// The menu for a right-clicked (or ⋯) row, several selected rows, or the
// empty space below the rows.
export function treeMenuItems(
  target: MenuTarget,
  props: VaultFileTreeProps,
  actions: ReturnType<typeof useTreeActions>,
): TreeMenuItem[] {
  const newItems = (parentPath: string): TreeMenuItem[] => [
    ...(props.createNewFile
      ? [{ label: "New Note", icon: <HiOutlineDocumentAdd {...ICON} />, onSelect: () => actions.startCreate("file", parentPath) }]
      : []),
    ...(props.createFolder
      ? [{ label: "New Folder", icon: <HiOutlineFolderAdd {...ICON} />, onSelect: () => actions.startCreate("folder", parentPath) }]
      : []),
  ];

  if (target.type === "background") return newItems("");

  const paths = actions.targetPaths(target.path);
  const trash: TreeMenuItem = {
    label: paths.length > 1 ? `Move ${paths.length} Items to Trash` : "Move to Trash",
    icon: <HiOutlineTrash {...ICON} />,
    shortcut: trashShortcut(),
    destructive: true,
    separated: true,
    onSelect: () => void actions.trashPaths(paths),
  };
  if (paths.length > 1) {
    const notes = paths.filter((path) => actions.kindOf(path) === "file");
    return [
      ...(notes.length > 0
        ? [{
            label: notes.length > 1 ? `Open ${notes.length} Notes` : "Open",
            icon: <HiOutlineDocumentText {...ICON} />,
            onSelect: () => notes.forEach(actions.openPath),
          }]
        : []),
      { ...trash, separated: notes.length > 0 },
    ];
  }

  const rename: TreeMenuItem = {
    label: "Rename",
    icon: <HiOutlinePencil {...ICON} />,
    shortcut: renameShortcut(),
    // The flat search list has no field to rename in: the name prompt.
    onSelect: () => {
      if (props.treeView) {
        actions.startRename(target.path);
        return;
      }
      const file = actions.entryByPath.get(target.path);
      if (file) props.renameFile(file.handle, undefined, target.path);
    },
  };
  if (target.kind === "folder") {
    const create = newItems(target.path);
    return [...create, { ...rename, separated: create.length > 0 }, trash];
  }

  const entry = actions.entryByPath.get(target.path);
  return [
    { label: "Open", icon: <HiOutlineDocumentText {...ICON} />, onSelect: () => actions.openPath(target.path) },
    ...(props.openFileInPane && entry
      ? [{
          label: "Open in Pane",
          icon: <HiOutlineTemplate {...ICON} />,
          onSelect: () => props.openFileInPane!(entry.handle as FileSystemFileHandle, target.path),
        }]
      : []),
    { ...rename, separated: true },
    ...(props.duplicateFile && entry
      ? [{ label: "Duplicate", icon: <HiOutlineDuplicate {...ICON} />, onSelect: () => props.duplicateFile!(entry.handle) }]
      : []),
    trash,
  ];
}
