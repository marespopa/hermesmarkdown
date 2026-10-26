"use client";

import React, { useCallback } from "react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { HiOutlineClipboardCopy, HiOutlineCode, HiOutlinePencil, HiOutlineTrash } from "react-icons/hi";
import { TbPinned, TbPinnedFilled } from "react-icons/tb";
import { atom_boardMarkdownPaths, atom_toggleBoardMarkdown } from "@/app/atoms/board-atoms";
import { atom_liveHandles, atom_openFiles } from "@/app/atoms/atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_busyPaths, busyEntry } from "@/app/atoms/busy-path-atoms";
import { showCopyToast, showErrorToast } from "@/app/components/Toastr";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { usePins } from "@/app/hooks/use-pins";
import type { PanelLeaf } from "@/app/types/workspace";
import { isBoard } from "@/app/utils/board/is-board";
import type { TabContextMenuItem } from "../components/TabContextMenu";
import { usePaneFileActions } from "./use-pane-file-actions";

// The open note's menu, opened from the pane's title: Copy Contents, Edit as Markdown /
// Open as Board for a board, Pin / Unpin; then Rename… and Move to Trash for
// a vault note; then Close, Close Others and Close All (of `leaf`).
export function useNoteMenuItems(leaf: PanelLeaf | null) {
  const store = useStore();
  const hasVault = !!useAtomValue(atom_vaultHandle);
  const { isPinned: isPinnedAs, togglePin } = usePins();
  const boardMarkdownPaths = useAtomValue(atom_boardMarkdownPaths);
  const toggleBoardMarkdown = useSetAtom(atom_toggleBoardMarkdown);
  const { renameFile, deleteFile } = useFileSystem();
  const { buildTabMenuItems } = usePaneFileActions(leaf);

  // `onRename` (the pane title, for its own note) renames in place instead of
  // through a prompt.
  return useCallback((path: string, options: { onRename?: () => void } = {}): TabContextMenuItem[] => {
    // Read when the menu opens: a subscription would re-render the pane's title on every keystroke.
    const content = store.get(atom_openFiles)[path]?.content ?? "";
    const items: TabContextMenuItem[] = [
      {
        label: "Copy Contents",
        icon: <HiOutlineClipboardCopy size={15} />,
        onClick: () => {
          navigator.clipboard.writeText(content).then(
            () => showCopyToast("Copied to clipboard!"),
            () => showErrorToast("Failed to copy"),
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
    // Notes in the vault can be pinned (the sidebar's Pinned section, first
    // in the palette);
    // the unsaved draft can't, and has no file to rename or trash.
    if (hasVault && path !== "draft") {
      const isPinned = isPinnedAs("note", path);
      items.push({
        label: isPinned ? "Unpin File" : "Pin File",
        icon: isPinned ? <TbPinnedFilled size={15} /> : <TbPinned size={15} />,
        onClick: () => void togglePin("note", path),
      });
      const handle = store.get(atom_liveHandles(path));
      // Not while a rename, move or move to Trash is working on it.
      const unavailable = !handle || !!busyEntry(store.get(atom_busyPaths), path);
      items.push(
        {
          label: options.onRename ? "Rename" : "Rename…",
          icon: <HiOutlinePencil size={15} />,
          disabled: unavailable,
          divider: true,
          onClick: () => {
            if (!handle || unavailable) return;
            if (options.onRename) options.onRename();
            else void renameFile(handle, undefined, path);
          },
        },
        {
          label: "Move to Trash",
          icon: <HiOutlineTrash size={15} />,
          disabled: unavailable,
          onClick: () => { if (handle && !unavailable) void deleteFile(handle, path); },
        },
      );
    }
    const closeItems = buildTabMenuItems(path);
    closeItems[0] = { ...closeItems[0], divider: true };
    return [...items, ...closeItems];
  }, [store, hasVault, isPinnedAs, togglePin, boardMarkdownPaths, toggleBoardMarkdown, renameFile, deleteFile, buildTabMenuItems]);
}
