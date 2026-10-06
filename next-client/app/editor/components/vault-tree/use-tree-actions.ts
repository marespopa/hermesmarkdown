"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RowEditing } from "./FileRow";
import type { PendingCreate } from "./TreeNodes";
import {
  ancestorPaths,
  type DraggedEntry,
  getEntryId,
  isDescendantOrSelf,
  parentFolderPath,
  type VaultFileTreeProps,
  type VisibleRow,
} from "./tree-model";
import type { useTreeSelection } from "./use-tree-selection";

export type MenuTarget =
  | { type: "row"; kind: "file" | "folder"; path: string }
  | { type: "background" };

const NEW_NAMES = { file: "Untitled", folder: "untitled folder" } as const;

const joinPath = (parent: string, name: string) => (parent ? `${parent}/${name}` : name);

interface UseTreeActionsArgs {
  props: VaultFileTreeProps;
  rows: VisibleRow[];
  selection: ReturnType<typeof useTreeSelection>;
  isFolderCollapsed: (path: string) => boolean;
  toggleFolder: (path: string) => void;
  expandFolder: (path: string) => void;
  draggedEntry: DraggedEntry | null;
  setDraggedEntry: (entry: DraggedEntry | null) => void;
  // Gives the keyboard back to the tree after naming in place.
  focusTree: () => void;
  scrollToPath: (path: string) => boolean;
}

// What the file tree does, apart from drawing it: renaming and creating in
// place, moving the selection to the Trash, opening, dragging several
// items, and selecting what was just created or moved once it shows up.
export function useTreeActions({
  props,
  rows,
  selection,
  isFolderCollapsed,
  toggleFolder,
  expandFolder,
  draggedEntry,
  setDraggedEntry,
  focusTree,
  scrollToPath,
}: UseTreeActionsArgs) {
  const {
    processedFiles, openFile, onClose, renameFile, deleteFile, trashItems, moveItem, moveItems,
    resolveFolderHandle, createNewFile, createFolder,
  } = props;
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [creating, setCreating] = useState<{ kind: "file" | "folder"; parentPath: string } | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; target: MenuTarget } | null>(null);
  const pendingReveal = useRef<string[] | null>(null);

  const entryByPath = useMemo(
    () => new Map(processedFiles.map((entry) => [getEntryId(entry), entry])),
    [processedFiles],
  );
  const kindOf = useCallback(
    (path: string): "file" | "folder" => (entryByPath.has(path) ? "file" : "folder"),
    [entryByPath],
  );

  const handleFor = useCallback(async (path: string) => {
    const entry = entryByPath.get(path);
    if (entry) return entry.handle as FileSystemHandle;
    return (await resolveFolderHandle?.(path)) ?? null;
  }, [entryByPath, resolveFolderHandle]);

  // Selects `paths` as soon as they are in the tree (after the rescan),
  // opening their folders so they can be seen.
  const reveal = useCallback((paths: string[]) => {
    const wanted = paths.filter(Boolean);
    if (wanted.length === 0) return;
    pendingReveal.current = wanted;
    for (const ancestor of new Set(wanted.flatMap(ancestorPaths))) expandFolder(ancestor);
  }, [expandFolder]);

  useEffect(() => {
    const wanted = pendingReveal.current;
    if (!wanted) return;
    const visible = new Set(rows.map((row) => row.path));
    if (!wanted.every((path) => visible.has(path))) return;
    pendingReveal.current = null;
    selection.selectPaths(wanted);
    requestAnimationFrame(() => scrollToPath(wanted[0]));
  }, [rows, selection.selectPaths, scrollToPath]);

  const openPath = useCallback((path: string) => {
    const entry = entryByPath.get(path);
    if (!entry) return;
    openFile(entry.handle as FileSystemFileHandle, path);
    if (onClose && window.innerWidth < 1024) onClose();
  }, [entryByPath, openFile, onClose]);

  const openRow = useCallback((row: VisibleRow) => {
    if (row.type === "folder") toggleFolder(row.path);
    else openPath(row.path);
  }, [toggleFolder, openPath]);

  // The items an action on `path` applies to: the whole selection when the
  // row is part of it, else just the row.
  const targetPaths = useCallback((path: string) => (
    selection.selected.has(path) && selection.selected.size > 1 ? [...selection.selected] : [path]
  ), [selection.selected]);

  const trashPaths = useCallback(async (paths: string[]) => {
    const items = (await Promise.all(paths.map(async (path) => ({ handle: await handleFor(path), path }))))
      .filter((item): item is { handle: FileSystemHandle; path: string } => !!item.handle);
    if (items.length === 0) return;
    if (trashItems) await trashItems(items);
    else for (const item of items) await deleteFile(item.handle, item.path);
  }, [handleFor, trashItems, deleteFile]);

  const trashSelection = useCallback(() => {
    if (selection.selected.size > 0) void trashPaths([...selection.selected]);
  }, [selection.selected, trashPaths]);

  const startRename = useCallback((path: string) => {
    setMenu(null);
    setCreating(null);
    selection.selectOnly(path);
    setRenamingPath(path);
  }, [selection]);

  const renameEditing = useCallback((path: string): RowEditing | undefined => {
    if (renamingPath !== path) return undefined;
    const isFile = kindOf(path) === "file";
    const name = path.split("/").pop() ?? path;
    const shown = isFile ? name.replace(/\.md$/, "") : name;
    const finish = () => {
      setRenamingPath(null);
      focusTree();
    };
    return {
      initialValue: shown,
      onCancel: finish,
      onCommit: (value) => {
        finish();
        const typed = value.trim();
        if (!typed || typed === shown) return;
        const newName = isFile && name.endsWith(".md") && !typed.endsWith(".md") ? `${typed}.md` : typed;
        void (async () => {
          const handle = await handleFor(path);
          if (!handle) return;
          const newPath = await renameFile(handle, newName, path);
          if (typeof newPath === "string") reveal([newPath]);
        })();
      },
    };
  }, [renamingPath, kindOf, focusTree, handleFor, renameFile, reveal]);

  // Without `parentPath`: in the focused folder, or the focused item's
  // folder, else the vault root.
  const startCreate = useCallback((kind: "file" | "folder", parentPath?: string) => {
    if (kind === "folder" ? !createFolder : !createNewFile) return;
    const focused = rows.find((row) => row.path === selection.focusPath);
    const parent = parentPath ?? (focused
      ? (focused.type === "folder" ? focused.path : parentFolderPath(focused.path))
      : "");
    setMenu(null);
    setRenamingPath(null);
    for (const ancestor of [...ancestorPaths(parent), parent].filter(Boolean)) expandFolder(ancestor);
    setCreating({ kind, parentPath: parent });
  }, [createFolder, createNewFile, rows, selection.focusPath, expandFolder]);

  const pendingCreate = useMemo((): PendingCreate | null => {
    if (!creating) return null;
    const { kind, parentPath } = creating;
    const finish = () => {
      setCreating(null);
      focusTree();
    };
    return {
      kind,
      parentPath,
      editing: {
        initialValue: NEW_NAMES[kind],
        onCancel: finish,
        onCommit: (value) => {
          finish();
          const name = value.trim();
          if (!name) return;
          void (async () => {
            const dir = await resolveFolderHandle?.(parentPath);
            if (!dir) return;
            const created: any = kind === "folder"
              ? await createFolder?.(dir, name)
              : await createNewFile?.(dir, name);
            if (created?.name) reveal([joinPath(parentPath, created.name)]);
          })();
        },
      },
    };
  }, [creating, focusTree, resolveFolderHandle, createFolder, createNewFile, reveal]);

  // Dragging a selected row takes the whole selection along.
  const startDrag = useCallback((entry: DraggedEntry) => {
    if (!selection.selected.has(entry.path) || selection.selected.size < 2) {
      setDraggedEntry(entry);
      return;
    }
    const group = [...selection.selected].map((path): DraggedEntry => {
      const file = entryByPath.get(path);
      return file
        ? { kind: "file", path, name: file.name, handle: file.handle }
        : { kind: "folder", path, name: path.split("/").pop() ?? path };
    });
    setDraggedEntry({ ...entry, group });
  }, [selection.selected, entryByPath, setDraggedEntry]);

  // `entry` is passed by touch drag, whose handler outlives this render's
  // `draggedEntry`.
  const dropInto = useCallback(async (targetPath: string, entry: DraggedEntry | null = draggedEntry) => {
    if (!entry || !resolveFolderHandle || (!moveItem && !moveItems)) return;
    const items = (entry.group ?? [entry]).filter((item) =>
      parentFolderPath(item.path) !== targetPath &&
      !(item.kind === "folder" && isDescendantOrSelf(item.path, targetPath)),
    );
    const targetHandle = await resolveFolderHandle(targetPath);
    const handles = await Promise.all(items.map((item) =>
      item.kind === "file" ? item.handle : resolveFolderHandle(item.path),
    ));
    const moving = items.filter((_, i) => handles[i]);
    if (!targetHandle || moving.length === 0) return;
    if (!entry.group && moveItem) await moveItem(handles[0], targetHandle);
    else if (moveItems) await moveItems(handles.filter(Boolean), targetHandle);
    else for (const handle of handles.filter(Boolean)) await moveItem!(handle, targetHandle);
    reveal(moving.map((item) => joinPath(targetPath, item.name)));
  }, [draggedEntry, resolveFolderHandle, moveItem, moveItems, reveal]);

  const openMenu = useCallback((target: MenuTarget, x: number, y: number) => {
    if (target.type === "row" && !selection.selected.has(target.path)) selection.selectOnly(target.path);
    setMenu({ x, y, target });
  }, [selection]);

  return {
    renamingPath, startRename, renameEditing,
    pendingCreate, startCreate,
    menu, openMenu, closeMenu: () => setMenu(null),
    trashPaths, trashSelection, targetPaths,
    openPath, openRow, handleFor, startDrag, dropInto, kindOf, entryByPath, isFolderCollapsed,
  };
}
