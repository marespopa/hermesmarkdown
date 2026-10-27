"use client";

import {
  HiOutlineDocumentText,
  HiOutlineDuplicate,
  HiOutlinePencil,
  HiOutlineTemplate,
  HiOutlineTrash,
} from "react-icons/hi";
import { TEMPLATES_FOLDER } from "@/app/utils/templates/template-registry";
import { TbPinned } from "react-icons/tb";
import { fileCreateActions } from "./file-create-actions";
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
  const newItems = (parentPath: string): TreeMenuItem[] => {
    const items: TreeMenuItem[] = fileCreateActions({
      newNote: props.createNewFile ? () => actions.startCreate("file", parentPath) : undefined,
      newFolder: props.createFolder ? () => actions.startCreate("folder", parentPath) : undefined,
    }).map(({ label, icon, onSelect }) => ({ label, icon, onSelect }));
    // Never into the templates folder itself.
    const inTemplates = parentPath === TEMPLATES_FOLDER || parentPath.startsWith(`${TEMPLATES_FOLDER}/`);
    if (props.newFromFolderTemplate && !inTemplates) {
      items.push({
        label: "New from Folder Template…",
        icon: <HiOutlineTemplate {...ICON} />,
        onSelect: () => void props.newFromFolderTemplate!(parentPath).then((path) => {
          if (path) actions.reveal([path]);
        }),
      });
    }
    return items;
  };

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
            label: notes.length > 1 ? `Open ${notes.length} Files` : "Open",
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
  // Pin / Unpin: adds the note or folder to the sidebar's Pinned section.
  const targetPath = target.path;
  const pinItems = (kind: "file" | "folder", separated: boolean): TreeMenuItem[] =>
    props.isPinned && props.togglePin
      ? [{
          label: props.isPinned(targetPath, kind) ? "Unpin" : "Pin",
          icon: <TbPinned {...ICON} />,
          separated,
          onSelect: () => props.togglePin!(targetPath, kind),
        }]
      : [];

  if (target.kind === "folder") {
    const create = newItems(target.path);
    const pin = pinItems("folder", create.length > 0);
    return [...create, ...pin, { ...rename, separated: create.length + pin.length > 0 }, trash];
  }

  const entry = actions.entryByPath.get(target.path);
  return [
    { label: "Open", icon: <HiOutlineDocumentText {...ICON} />, onSelect: () => actions.openPath(target.path) },
    ...pinItems("file", false),
    { ...rename, separated: true },
    ...(props.duplicateFile && entry
      ? [{ label: "Duplicate", icon: <HiOutlineDuplicate {...ICON} />, onSelect: () => props.duplicateFile!(entry.handle) }]
      : []),
    trash,
  ];
}
