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
          className={`group relative ${actionMenuOpen ? "z-20" : ""}`}
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
                ? "ring-2 ring-sage/50 bg-sage/10 text-sage dark:text-sage font-medium"
                : "hover:bg-paper-softgray dark:hover:bg-paper-dark-surface/40 text-ink-muted dark:text-stone font-medium"
            }`}
          >
            <span className="w-4 flex items-center justify-center opacity-40">
              {isExpanded ? <HiOutlineChevronDown size={14} /> : <HiOutlineChevronRight size={14} />}
            </span>
            <HiOutlineFolder size={18} className="shrink-0 opacity-80 text-sage/60" />
            <span className="truncate">{dirHandle.name}</span>
          </div>

          <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity flex items-center z-10">
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
              <HiOutlineDotsVertical size={16} className="opacity-80" />
            </Button>
          </div>

          {actionMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={(e) => { e.stopPropagation(); setActionMenuOpen(null); }}
              />
              <div 
                onClick={(e) => e.stopPropagation()}
                className="fixed z-50 bg-paper-light dark:bg-paper-dark backdrop-blur-xl border border-edge-subtle rounded-2xl py-1.5 min-w-[160px] animate-in fade-in zoom-in-95 duration-200"
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
                  <HiOutlinePlus size={16} className="opacity-80" />
                  New File
                </Button>
                <div className="mx-3 my-1 border-t border-edge-subtle" />
                <Button
                  variant="menu-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    renameFile(dirHandle);
                    setActionMenuOpen(null);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-ui-footnote font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <HiOutlinePencil size={16} className="opacity-80" />
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
                  <HiOutlineTrash size={16} className="opacity-80" />
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
