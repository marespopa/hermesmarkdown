"use client";

import Button from "@/app/components/Button";
import { useEffect, useRef, useState } from "react";
import { HiFolder, HiOutlineDocumentAdd, HiOutlineDotsVertical, HiOutlineFolderAdd, HiOutlinePencil, HiOutlineTrash } from "react-icons/hi";
import { IoCaretForward } from "react-icons/io5";
import { LIST_INDENT_PX } from "./FileRow";
import { ListColumns } from "./list-columns";
import { canDropInto, type DraggedEntry, type TreeFolderNode } from "./tree-model";

export interface FolderRowProps {
  node: TreeFolderNode;
  depth: number;
  // List view's Date Modified / Kind columns (folders show "--" / "Folder").
  showColumns?: boolean;
  isCollapsed: boolean;
  // True when this folder is an ancestor of the currently active file —
  // gives the whole chain leading to the open file a subtle tint so it
  // reads as "this file lives here" at a glance.
  isActiveChain?: boolean;
  onToggle: (path: string) => void;
  actionMenuOpen: { x: number; y: number; path: string } | null;
  setActionMenuOpen: (v: { x: number; y: number; path: string } | null) => void;
  draggedEntry: DraggedEntry | null;
  setDraggedEntry: (v: DraggedEntry | null) => void;
  onDropInto: (targetPath: string) => void;
  // Touch drag (see useTouchTreeDrag): picks the row up on long press, and
  // highlights it while a touch-dragged entry hovers it.
  onTouchDragStart?: (e: React.TouchEvent) => void;
  isTouchPressing?: () => boolean;
  isTouchDropTarget?: boolean;
  resolveFolderHandle?: (path: string) => Promise<any | null>;
  createNewFile?: (targetDirectory?: FileSystemDirectoryHandle) => void | Promise<unknown>;
  createFolder?: (parentDirectory?: FileSystemDirectoryHandle) => Promise<FileSystemDirectoryHandle | null>;
  // Opens this folder so an item created from its menu is visible.
  expandFolder?: (path: string) => void;
  renameFile: (handle: any, newName?: string, path?: string) => void | Promise<void>;
  deleteFile: (handle: any, path?: string) => void;
}

export function FolderRow({
  node,
  depth,
  showColumns = false,
  isCollapsed,
  isActiveChain = false,
  onToggle,
  actionMenuOpen,
  setActionMenuOpen,
  draggedEntry,
  setDraggedEntry,
  onDropInto,
  onTouchDragStart,
  isTouchPressing,
  isTouchDropTarget = false,
  resolveFolderHandle,
  createNewFile,
  createFolder,
  expandFolder,
  renameFile,
  deleteFile,
}: FolderRowProps) {
  const [dragOver, setDragOver] = useState(false);
  const autoExpandTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entryId = `folder:${node.path}`;
  const menuOpen = actionMenuOpen?.path === entryId;

  const canAcceptDrop = canDropInto(draggedEntry, node.path);
  const isHighlighted = dragOver || isTouchDropTarget;

  const cancelAutoExpand = () => {
    if (autoExpandTimer.current) {
      clearTimeout(autoExpandTimer.current);
      autoExpandTimer.current = null;
    }
  };

  useEffect(() => cancelAutoExpand, [draggedEntry]);

  return (
    <div className={`group relative ${menuOpen ? "z-20" : ""}`}>
      <div
        onClick={() => onToggle(node.path)}
        draggable
        data-drop-folder={node.path}
        onTouchStart={onTouchDragStart}
        onDragStart={(e) => {
          if (isTouchPressing?.()) {
            e.preventDefault();
            return;
          }
          setDraggedEntry({ kind: "folder", path: node.path, name: node.name });
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => setDraggedEntry(null)}
        onDragOver={(e) => {
          e.preventDefault();
          if (canAcceptDrop) {
            setDragOver(true);
            e.dataTransfer.dropEffect = "move";
            if (isCollapsed && !autoExpandTimer.current) {
              autoExpandTimer.current = setTimeout(() => {
                autoExpandTimer.current = null;
                onToggle(node.path);
              }, 400);
            }
          } else {
            cancelAutoExpand();
          }
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDragOver(false);
          cancelAutoExpand();
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          cancelAutoExpand();
          if (canAcceptDrop) onDropInto(node.path);
          setDraggedEntry(null);
        }}
        tabIndex={-1}
        aria-expanded={!isCollapsed}
        style={{ paddingLeft: 12 + depth * LIST_INDENT_PX }}
        className={`mx-1 flex h-[var(--list-row,28px)] items-center gap-1.5 rounded-md pr-8 cursor-pointer text-ui-subhead relative select-none [-webkit-touch-callout:none] ${
          isHighlighted
            ? "ring-2 ring-inset ring-sage/50 bg-sage/10 text-sage dark:text-sage"
            : `text-fg hover:bg-paper-softgray/60 dark:hover:bg-paper-dark-surface/50 ${isActiveChain ? "font-medium" : ""}`
        }`}
      >
        <IoCaretForward
          size={10}
          aria-hidden
          className={`w-3 shrink-0 text-fg-faint transition-transform duration-150 ${isCollapsed ? "" : "rotate-90"}`}
        />
        <HiFolder size={16} className="shrink-0 text-sage" />
        <span title={node.name} className="min-w-0 flex-1 truncate">{node.name}</span>
        {showColumns && <ListColumns modified="--" kind="Folder" />}
      </div>

      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity z-10">
        <Button
          variant="icon"
          className="w-7 h-7"
          aria-label="Folder options"
          onClick={(e) => {
            e.stopPropagation();
            if (menuOpen) {
              setActionMenuOpen(null);
            } else {
              const rect = e.currentTarget.getBoundingClientRect();
              setActionMenuOpen({
                x: rect.right,
                y: rect.bottom > window.innerHeight - 170 ? rect.top - 150 : rect.bottom + 4,
                path: entryId,
              });
            }
          }}
        >
          <HiOutlineDotsVertical size={14} className="opacity-80" />
        </Button>
      </div>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => { e.stopPropagation(); setActionMenuOpen(null); }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed z-50 bg-paper-light dark:bg-paper-dark backdrop-blur-xl border border-edge-subtle rounded-xl py-1 min-w-[140px] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 ease-out"
            style={{ top: actionMenuOpen!.y, left: actionMenuOpen!.x - 140 }}
          >
            {createNewFile && (
              <Button
                variant="menu-item"
                onClick={async (e) => {
                  e.stopPropagation();
                  setActionMenuOpen(null);
                  const dir = await resolveFolderHandle?.(node.path);
                  expandFolder?.(node.path);
                  await createNewFile(dir ?? undefined);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-ui-footnote font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <HiOutlineDocumentAdd size={14} className="opacity-80" />
                New File
              </Button>
            )}
            {createFolder && (
              <Button
                variant="menu-item"
                onClick={async (e) => {
                  e.stopPropagation();
                  setActionMenuOpen(null);
                  const dir = await resolveFolderHandle?.(node.path);
                  expandFolder?.(node.path);
                  await createFolder(dir ?? undefined);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-ui-footnote font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <HiOutlineFolderAdd size={14} className="opacity-80" />
                New Folder
              </Button>
            )}
            <Button
              variant="menu-item"
              onClick={async (e) => {
                e.stopPropagation();
                setActionMenuOpen(null);
                const handle = await resolveFolderHandle?.(node.path);
                if (handle) await renameFile(handle, undefined, node.path);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-ui-footnote font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <HiOutlinePencil size={14} className="opacity-80" />
              Rename
            </Button>
            <Button
              variant="menu-item"
              onClick={async (e) => {
                e.stopPropagation();
                setActionMenuOpen(null);
                const handle = await resolveFolderHandle?.(node.path);
                if (handle) deleteFile(handle, node.path);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-ui-footnote font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-red-500"
            >
              <HiOutlineTrash size={14} className="opacity-80" />
              Delete
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
