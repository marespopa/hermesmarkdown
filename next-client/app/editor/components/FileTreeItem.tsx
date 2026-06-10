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
  const [actionMenuOpen, setActionMenuOpen] = useState<{ x: number, y: number } | null>(null);

  const isActive = path === activeFilePath;

  return (
    <div
      className="group relative"
      draggable
      onDragStart={(e) => {
        setDraggedEntry(fileHandle);
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      <div
        onClick={() => {
          openFile(fileHandle, path);
          if (onClose && window.innerWidth < 1024) onClose();
        }}
        style={{ paddingLeft: `${(level + 1) * 1.25}rem` }}
        className={`flex items-center gap-3 pr-12 py-2 rounded-xl cursor-pointer transition-all text-ui-subhead relative ${
          isActive
            ? "text-sage dark:text-sage font-bold bg-sage/10"
            : "hover:bg-paper-softgray dark:hover:bg-paper-dark-surface/40 text-ink-muted dark:text-stone font-medium"
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
            if (actionMenuOpen) {
              setActionMenuOpen(null);
            } else {
              const rect = e.currentTarget.getBoundingClientRect();
              // Prevent clipping by ensuring the menu stays on screen (rough estimate 100px height)
              const y = rect.bottom > window.innerHeight - 120 ? rect.top - 100 : rect.bottom + 4;
              setActionMenuOpen({ x: rect.right, y });
            }
          }}
          title="File options"
          aria-label="File options"
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
            className="fixed z-50 bg-paper-light/90 dark:bg-paper-dark/90 backdrop-blur-xl border border-edge-subtle rounded-2xl shadow-2xl py-1.5 min-w-[160px] animate-in fade-in zoom-in-95 duration-200"
            style={{ top: actionMenuOpen.y, left: actionMenuOpen.x - 160 }}
          >
            <Button
              variant="menu-item"
              onClick={(e) => {
                e.stopPropagation();
                renameFile(fileHandle);
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
                deleteFile(fileHandle);
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
  );
}
