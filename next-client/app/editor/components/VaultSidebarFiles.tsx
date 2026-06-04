"use client";

import React, { useState } from "react";
import {
  HiOutlineDocumentText,
  HiOutlineFolder,
  HiOutlineX,
  HiOutlineDotsVertical,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlinePlus,
} from "react-icons/hi";
import Button from "@/app/components/Button";
import SidebarHeader from "./SidebarHeader";

interface VaultSidebarFilesProps {
  isFilesExpanded: boolean;
  setIsFilesExpanded: (expanded: boolean) => void;
  onNewFile?: () => void;
  createNewFile: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  processedFiles: any[];
  selectedTag: string | null;
  activeFilePath: string | null;
  openFile: (handle: FileSystemFileHandle, path?: string) => void;
  navigateTo: (handle: FileSystemDirectoryHandle) => void;
  renameFile: (handle: FileSystemHandle) => void;
  deleteFile: (handle: FileSystemHandle) => void;
  onClose?: () => void;
}

export default function VaultSidebarFiles({
  isFilesExpanded,
  setIsFilesExpanded,
  onNewFile,
  createNewFile,
  searchQuery,
  setSearchQuery,
  processedFiles,
  selectedTag,
  activeFilePath,
  openFile,
  navigateTo,
  renameFile,
  deleteFile,
  onClose,
}: VaultSidebarFilesProps) {
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      {!selectedTag && (
        <SidebarHeader
          title="Files"
          isExpanded={isFilesExpanded}
          onToggle={() => setIsFilesExpanded(!isFilesExpanded)}
          action={
            <Button
              variant="icon"
              className="w-6 h-6 opacity-30 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                if (onNewFile) {
                  onNewFile();
                } else {
                  createNewFile();
                }
              }}
              title="New File"
            >
              <HiOutlinePlus size={14} />
            </Button>
          }
        />
      )}
      {isFilesExpanded && (
        <div className="px-1 mb-4">
          <div className="relative group/search">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full bg-zinc-200/40 dark:bg-zinc-800/40 border-none rounded-xl px-3 py-2.5 text-ui-caption outline-none focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-zinc-400 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
              >
                <HiOutlineX size={12} />
              </button>
            )}
          </div>
        </div>
      )}
      {isFilesExpanded && processedFiles.map((entry, idx) => {
        const isActive = (selectedTag || searchQuery) 
          ? (entry as any).path === activeFilePath 
          : activeFilePath?.split("/").pop() === entry.name;
        return (
          <div
            key={`${entry.kind || 'file'}-${entry.name}-${idx}`}
            className="group relative"
            onMouseLeave={() => setActionMenuOpen(null)}
          >
            <div
              onClick={() => {
                if (selectedTag || (searchQuery && entry.kind === "file")) {
                  openFile(entry.handle as FileSystemFileHandle, (entry as any).path);
                  if (onClose && window.innerWidth < 1024) onClose();
                } else if (entry.kind === "file") {
                  openFile(entry as FileSystemFileHandle);
                  if (onClose && window.innerWidth < 1024) onClose();
                } else {
                  navigateTo(entry as FileSystemDirectoryHandle);
                }
              }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-all text-ui-subhead pr-12 relative ${
                isActive
                  ? "text-blue-600 dark:text-blue-400 font-bold bg-blue-500/10"
                  : "hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400 font-medium"
              }`}
            >
              {entry.kind === "directory" ? (
                <HiOutlineFolder size={18} className="shrink-0 opacity-60" />
              ) : (
                <HiOutlineDocumentText size={18} className="shrink-0 opacity-60" />
              )}
              <div className="flex flex-col truncate leading-tight">
                <span className="truncate">{entry.name}</span>
                {searchQuery && (entry as any).path && (entry as any).path !== entry.name && (
                  <span className="text-ui-footnote opacity-40 truncate mt-0.5">
                    {(entry as any).path.split('/').slice(0, -1).join('/')}
                  </span>
                )}
              </div>
            </div>

            {!selectedTag && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                <Button
                  variant="icon"
                  className="w-8 h-8 flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActionMenuOpen(
                      actionMenuOpen === entry.name ? null : entry.name,
                    );
                  }}
                >
                  <HiOutlineDotsVertical size={16} className="opacity-60" />
                </Button>
              </div>
            )}

            {actionMenuOpen === entry.name && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setActionMenuOpen(null)}
                />
                <div className="absolute right-2 top-[80%] z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-2xl py-1.5 min-w-[140px] animate-in fade-in zoom-in-95 duration-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      renameFile(entry);
                      setActionMenuOpen(null);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-ui-footnote font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <HiOutlinePencil size={16} className="opacity-60" />
                    Rename
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFile(entry);
                      setActionMenuOpen(null);
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
        )
      })}

      {isFilesExpanded && processedFiles.length === 0 && (
        <div className="p-8 text-center opacity-30 text-ui-footnote font-medium italic">
          {searchQuery ? "No results found" : "Empty directory"}
        </div>
      )}
    </div>
  );
}
