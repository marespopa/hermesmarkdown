"use client";

import React, { useState } from "react";
import {
  HiOutlineDocumentText,
  HiOutlineDotsVertical,
  HiOutlineTrash,
  HiOutlinePencil,
} from "react-icons/hi";
import Button from "@/app/components/Button";

interface FileTreeItemProps {
  fileHandle: FileSystemFileHandle;
  path: string;
  level: number;
  activeFilePath: string | null;
  openFile: (handle: FileSystemFileHandle, path?: string) => void;
  renameFile: (handle: FileSystemHandle) => void;
  deleteFile: (handle: FileSystemHandle) => void;
  onClose?: () => void;
  setDraggedEntry: (entry: any) => void;
}

export default function FileTreeItem({
  fileHandle,
  path,
  level,
  activeFilePath,
  openFile,
  renameFile,
  deleteFile,
  onClose,
  setDraggedEntry,
}: FileTreeItemProps) {
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  const isActive = path === activeFilePath;

  return (
    <div
      className="group relative"
      draggable
      onDragStart={(e) => {
        setDraggedEntry(fileHandle);
        e.dataTransfer.effectAllowed = "move";
      }}
      onMouseLeave={() => setActionMenuOpen(false)}
    >
      <div
        onClick={() => {
          openFile(fileHandle, path);
          if (onClose && window.innerWidth < 1024) onClose();
        }}
        style={{ paddingLeft: `${(level + 1) * 1.25}rem` }}
        className={`flex items-center gap-3 pr-12 py-2 rounded-xl cursor-pointer transition-all text-ui-subhead relative ${
          isActive
            ? "text-blue-600 dark:text-blue-400 font-bold bg-blue-500/10"
            : "hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400 font-medium"
        }`}
      >
        <HiOutlineDocumentText size={18} className="shrink-0 opacity-60" />
        <span className="truncate">{fileHandle.name}</span>
      </div>

      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
        <Button
          variant="icon"
          className="w-8 h-8 flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            setActionMenuOpen(!actionMenuOpen);
          }}
        >
          <HiOutlineDotsVertical size={16} className="opacity-60" />
        </Button>
      </div>

      {actionMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setActionMenuOpen(false)}
          />
          <div className="absolute right-2 top-[80%] z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-2xl py-1.5 min-w-[160px] animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                renameFile(fileHandle);
                setActionMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-ui-footnote font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <HiOutlinePencil size={16} className="opacity-60" />
              Rename
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteFile(fileHandle);
                setActionMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-ui-footnote font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-red-500"
            >
              <HiOutlineTrash size={16} className="opacity-60" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
