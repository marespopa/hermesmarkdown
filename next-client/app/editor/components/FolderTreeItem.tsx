"use client";

import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import {
  HiOutlineFolder,
  HiOutlineDotsVertical,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineChevronRight,
  HiOutlineChevronDown,
} from "react-icons/hi";
import Button from "@/app/components/Button";
import FileTreeItem from "./FileTreeItem";
import { useAtomValue } from "jotai";
import { atom_fileSystemVersion } from "@/app/atoms/atoms";

interface FolderTreeItemProps {
  dirHandle: FileSystemDirectoryHandle;
  path: string;
  level: number;
  activeFilePath: string | null;
  openFile: (handle: FileSystemFileHandle, path?: string) => void;
  createNewFile: (dirHandle: FileSystemDirectoryHandle) => void;
  renameFile: (handle: FileSystemHandle) => void;
  deleteFile: (handle: FileSystemHandle) => void;
  moveItem: (handle: FileSystemHandle, targetDir: FileSystemDirectoryHandle) => void;
  onClose?: () => void;
  isRoot?: boolean;
  draggedEntry: any | null;
  setDraggedEntry: (entry: any | null) => void;
}

const FolderTreeItem = memo(function FolderTreeItem({
  dirHandle,
  path,
  level,
  activeFilePath,
  openFile,
  createNewFile,
  renameFile,
  deleteFile,
  moveItem,
  onClose,
  isRoot = false,
  draggedEntry,
  setDraggedEntry,
}: FolderTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(isRoot);
  const [children, setChildren] = useState<FileSystemHandle[]>([]);
  const [actionMenuOpen, setActionMenuOpen] = useState<{ x: number, y: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fsVersion = useAtomValue(atom_fileSystemVersion);
  const lastActiveRef = useRef<string | null>(null);

  // Auto-expand if the active file is inside this folder
  useEffect(() => {
    if (activeFilePath && activeFilePath !== lastActiveRef.current) {
      const isParentOfActive = isRoot || activeFilePath.startsWith(path + "/");
      if (isParentOfActive) {
        setIsExpanded(true);
      }
    }
    lastActiveRef.current = activeFilePath;
  }, [activeFilePath, path, isRoot]);

  const loadOpenFolder = useCallback(async () => {
    if (!isExpanded) return;
    try {
      const entries: FileSystemHandle[] = [];
      for await (const entry of (dirHandle as any).values()) {
        if (entry.kind === "directory" || (entry.kind === "file" && entry.name.endsWith(".md"))) {
          entries.push(entry);
        }
      }
      // Sort: Folders first, then alphabetical
      entries.sort((a, b) => {
        if (a.kind === "directory" && b.kind === "file") return -1;
        if (a.kind === "file" && b.kind === "directory") return 1;
        return a.name.localeCompare(b.name);
      });
      setChildren(entries);
    } catch (err) {
      console.warn("Failed to load folder contents:", err);
    }
  }, [dirHandle, isExpanded]);

  useEffect(() => {
    loadOpenFolder();
  }, [loadOpenFolder, fsVersion]);

  // Handle drag and drop
  const onDragStart = (e: React.DragEvent) => {
    setDraggedEntry(dirHandle);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedEntry && draggedEntry.name !== dirHandle.name) {
      setDragOver(true);
      e.dataTransfer.dropEffect = "move";
    }
  };

  const onDragLeave = () => {
    setDragOver(false);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (draggedEntry && draggedEntry.name !== dirHandle.name) {
      moveItem(draggedEntry, dirHandle);
    }
    setDraggedEntry(null);
  };

  return (
    <div className="flex flex-col">
      {!isRoot && (
        <div
          className="group relative"
          draggable
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <div
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ paddingLeft: `${level * 1.25}rem` }}
            className={`flex items-center gap-2 pr-12 py-2 rounded-xl cursor-pointer transition-all text-ui-subhead relative ${
              dragOver
                ? "ring-2 ring-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium"
                : "hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400 font-medium"
            }`}
          >
            <span className="w-4 flex items-center justify-center opacity-40">
              {isExpanded ? <HiOutlineChevronDown size={14} /> : <HiOutlineChevronRight size={14} />}
            </span>
            <HiOutlineFolder size={18} className="shrink-0 opacity-60 text-blue-500/60" />
            <span className="truncate">{dirHandle.name}</span>
          </div>

          <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
            <Button
              variant="icon"
              className="w-8 h-8 flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                if (actionMenuOpen) {
                  setActionMenuOpen(null);
                } else {
                  const rect = e.currentTarget.getBoundingClientRect();
                  // Prevent clipping by ensuring the menu stays on screen (rough estimate 150px height)
                  const y = rect.bottom > window.innerHeight - 170 ? rect.top - 150 : rect.bottom + 4;
                  setActionMenuOpen({ x: rect.right, y });
                }
              }}
              title="Folder options"
              aria-label="Folder options"
            >
              <HiOutlineDotsVertical size={16} className="opacity-60" />
            </Button>
          </div>

          {actionMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={(e) => { e.stopPropagation(); setActionMenuOpen(null); }}
              />
              <div 
                className="fixed z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-2xl py-1.5 min-w-[160px] animate-in fade-in zoom-in-95 duration-200"
                style={{ top: actionMenuOpen.y, left: actionMenuOpen.x - 160 }}
              >
                <Button
                  variant="menu-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActionMenuOpen(null);
                    createNewFile(dirHandle);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-ui-footnote font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <HiOutlinePlus size={16} className="opacity-60" />
                  New File
                </Button>
                <div className="mx-3 my-1 border-t border-zinc-200/50 dark:border-zinc-700/50" />
                <Button
                  variant="menu-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    renameFile(dirHandle);
                    setActionMenuOpen(null);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-ui-footnote font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <HiOutlinePencil size={16} className="opacity-60" />
                  Rename
                </Button>
                <Button
                  variant="menu-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteFile(dirHandle);
                    setActionMenuOpen(null);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-ui-footnote font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-red-500"
                >
                  <HiOutlineTrash size={16} className="opacity-60" />
                  Delete
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {isExpanded && (
        <div className={isRoot ? "" : "ml-0"}>
          {children.map((child) => {
            const childPath = isRoot ? child.name : `${path}/${child.name}`;
            if (child.kind === "directory") {
              return (
                <FolderTreeItem
                  key={childPath}
                  dirHandle={child as FileSystemDirectoryHandle}
                  path={childPath}
                  level={isRoot ? level : level + 1}
                  activeFilePath={activeFilePath}
                  openFile={openFile}
                  createNewFile={createNewFile}
                  renameFile={renameFile}
                  deleteFile={deleteFile}
                  moveItem={moveItem}
                  onClose={onClose}
                  draggedEntry={draggedEntry}
                  setDraggedEntry={setDraggedEntry}
                />
              );
            } else {
              return (
                <FileTreeItem
                  key={childPath}
                  fileHandle={child as FileSystemFileHandle}
                  path={childPath}
                  level={isRoot ? level : level + 1}
                  activeFilePath={activeFilePath}
                  openFile={openFile}
                  renameFile={renameFile}
                  deleteFile={deleteFile}
                  onClose={onClose}
                  setDraggedEntry={setDraggedEntry}
                />
              );
            }
          })}
        </div>
      )}
    </div>
  );
});

export default FolderTreeItem;
