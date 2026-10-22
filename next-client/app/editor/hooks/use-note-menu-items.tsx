"use client";

import React, { useCallback } from "react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { HiOutlineClipboardCopy, HiOutlineCode, HiOutlinePencil, HiOutlineTrash } from "react-icons/hi";
import { TbPinned, TbPinnedFilled } from "react-icons/tb";
import { atom_boardMarkdownPaths, atom_toggleBoardMarkdown } from "@/app/atoms/board-atoms";
import { atom_liveHandles, atom_openFiles } from "@/app/atoms/atoms";
import { atom_pinnedNotePaths, atom_toggleNotePin } from "@/app/atoms/note-pin-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { showCopyToast, showErrorToast } from "@/app/components/Toastr";
import { useFileSystem } from "@/app/hooks/use-file-system";
import type { PanelLeaf } from "@/app/types/workspace";
import { isBoard } from "@/app/utils/board/is-board";
import type { TabContextMenuItem } from "../components/TabContextMenu";
import { usePaneFileActions } from "./use-pane-file-actions";

// One open note's menu, the same wherever it's opened (the pane's title,
// the sidebar's Open Notes): Copy Markdown, Edit as Markdown /
// Open as Board for a board, Pin / Unpin; then Rename… and Move to Trash for
// a vault note; then Close, Close Others and Close All (of `leaf`).
export function useNoteMenuItems(leaf: PanelLeaf | null) {
  const store = useStore();
  const openFiles = useAtomValue(atom_openFiles);
  const hasVault = !!useAtomValue(atom_vaultHandle);
  const pinnedNotePaths = useAtomValue(atom_pinnedNotePaths);
  const toggleNotePin = useSetAtom(atom_toggleNotePin);
  const boardMarkdownPaths = useAtomValue(atom_boardMarkdownPaths);
  const toggleBoardMarkdown = useSetAtom(atom_toggleBoardMarkdown);
  const { renameFile, deleteFile } = useFileSystem();
  const { buildTabMenuItems } = usePaneFileActions(leaf);

  // `onRename` (the pane title, for its own note) renames in place instead of
  // through a prompt.
  return useCallback((path: string, options: { onRename?: () => void } = {}): TabContextMenuItem[] => {
    const content = openFiles[path]?.content ?? "";
    const items: TabContextMenuItem[] = [
      {
        label: "Copy Markdown",
        icon: <HiOutlineClipboardCopy size={15} />,
        onClick: () => {
          navigator.clipboard.writeText(content).then(
            () => showCopyToast("Markdown copied to clipboard!"),
            () => showErrorToast("Failed to copy markdown"),
          );
        },
      },
    ];
    if (path !== "draft" && isBoard(path, content)) {
      items.push({
        label: boardMarkdownPaths.has(path) ? "Open as Board" : "Edit as Markdown",
        icon: <HiOutlineCode size={15} />,
        onClick: () => toggleBoardMarkdown(path),
      });
    }
    // Notes in the vault can be pinned (first in the palette and in Files);
    // the unsaved draft can't, and has no file to rename or trash.
    if (hasVault && path !== "draft") {
      const isPinned = pinnedNotePaths.includes(path);
      items.push({
        label: isPinned ? "Unpin Note" : "Pin Note",
        icon: isPinned ? <TbPinnedFilled size={15} /> : <TbPinned size={15} />,
        onClick: () => toggleNotePin(path),
      });
      const handle = store.get(atom_liveHandles(path));
      items.push(
        {
          label: options.onRename ? "Rename" : "Rename…",
          icon: <HiOutlinePencil size={15} />,
          disabled: !handle,
          divider: true,
          onClick: () => {
            if (!handle) return;
            if (options.onRename) options.onRename();
            else void renameFile(handle, undefined, path);
          },
        },
        {
          label: "Move to Trash",
          icon: <HiOutlineTrash size={15} />,
          disabled: !handle,
          onClick: () => { if (handle) void deleteFile(handle, path); },
        },
      );
    }
    const closeItems = buildTabMenuItems(path);
    closeItems[0] = { ...closeItems[0], divider: true };
    return [...items, ...closeItems];
  }, [store, openFiles, hasVault, pinnedNotePaths, toggleNotePin, boardMarkdownPaths, toggleBoardMarkdown, renameFile, deleteFile, buildTabMenuItems]);
}
