"use client";

import Button from "@/app/components/Button";
import { useEffect, useRef, useState } from "react";
import { HiOutlineChevronDown, HiOutlineChevronRight, HiOutlineDotsVertical, HiOutlineFolder, HiOutlinePencil, HiOutlineTrash } from "react-icons/hi";
import { TreeGutter, type TreeGutterInfo } from "./FileRow";
import { type DraggedEntry, isDescendantOrSelf, type TreeFolderNode } from "./tree-model";

export interface FolderRowProps {
  node: TreeFolderNode;
  treeGutter?: TreeGutterInfo;
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
  resolveFolderHandle?: (path: string) => Promise<any | null>;
  createNewFile?: (targetDirectory?: FileSystemDirectoryHandle) => void | Promise<unknown>;
  createFolder?: (parentDirectory?: FileSystemDirectoryHandle) => Promise<FileSystemDirectoryHandle | null>;
  // Opens this folder so an item created from its menu is visible.
  expandFolder?: (path: string) => void;
  renameFile: (handle: any) => void | Promise<void>;
  deleteFile: (handle: any, path?: string) => void;
}

export function FolderRow({
  node,
  treeGutter,
  isCollapsed,
  isActiveChain = false,
  onToggle,
  actionMenuOpen,
  setActionMenuOpen,
  draggedEntry,
  setDraggedEntry,
  onDropInto,
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

  const canAcceptDrop =
    !!draggedEntry &&
    !(draggedEntry.kind === "folder" && isDescendantOrSelf(draggedEntry.path, node.path)) &&
    draggedEntry.path.split("/").slice(0, -1).join("/") !== node.path;

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
        onDragStart={(e) => {
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
        className={`flex items-stretch mx-1 pr-8 cursor-pointer text-ui-subhead transition-colors relative ${
          dragOver
            ? "ring-2 ring-sage/50 bg-sage/10 text-sage dark:text-sage font-medium"
            : isActiveChain
              ? "text-ink-light dark:text-ink-dark font-medium hover:bg-paper-softgray/60 dark:hover:bg-paper-dark-surface/50"
              : "text-ink-muted dark:text-stone font-medium hover:bg-paper-softgray/60 dark:hover:bg-paper-dark-surface/50"
        }`}
      >
        {treeGutter && <TreeGutter {...treeGutter} />}
        <div className="flex items-center gap-1 pl-2 pr-4 py-2 min-w-0 flex-1">
          <span className="w-3 flex items-center justify-center opacity-40 shrink-0">
            {isCollapsed ? <HiOutlineChevronRight size={13} /> : <HiOutlineChevronDown size={13} />}
          </span>
          <HiOutlineFolder size={16} className="shrink-0 opacity-70" />
          <span title={node.name} className="truncate">{node.name}</span>
        </div>
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
                New Folder
              </Button>
            )}
            <Button
              variant="menu-item"
              onClick={async (e) => {
                e.stopPropagation();
                setActionMenuOpen(null);
                const handle = await resolveFolderHandle?.(node.path);
                if (handle) await renameFile(handle);
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
