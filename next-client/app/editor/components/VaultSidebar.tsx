"use client";

import React from "react";
import { useFileSystem } from "@/app/hooks/use-file-system";
import {
  HiOutlineDocumentText,
  HiOutlineFolder,
  HiOutlinePlus,
  HiOutlineChevronLeft,
  HiOutlineX,
  HiOutlineDotsVertical,
  HiOutlineTrash,
  HiOutlinePencil,
} from "react-icons/hi";
import Button from "@/app/components/Button";
import { useState } from "react";

interface VaultSidebarProps {
  onClose?: () => void;
}

export default function VaultSidebar({ onClose }: VaultSidebarProps) {
  const {
    vaultFiles,
    openFile,
    createNewFile,
    vaultHandle,
    currentDirectoryHandle,
    activeFileHandle,
    navigateTo,
    navigateBack,
    deleteFile,
    renameFile,
    vaultTags,
    isVaultPending,
    restoreVault,
  } = useFileSystem();

  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  if (!vaultHandle) return null;

  if (isVaultPending) {
    return (
      <div className="w-64 h-full border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex flex-col items-center justify-center p-6 text-center animate-in slide-in-from-left duration-300">
        <HiOutlineFolder size={48} className="opacity-20 mb-4" />
        <h2 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-2">Vault Access Paused</h2>
        <p className="text-[10px] opacity-40 mb-6 leading-relaxed">Browser security requires re-authorization to access your local files after a refresh.</p>
        <Button variant="primary" onClick={restoreVault} className="w-full">
          Restore Access
        </Button>
      </div>
    );
  }

  const isAtRoot =
    !currentDirectoryHandle || vaultHandle.name === currentDirectoryHandle.name;

  const tags = Object.keys(vaultTags).sort();
  const filteredFiles = selectedTag ? vaultTags[selectedTag] : null;

  return (
    <div className="w-64 h-full border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex flex-col animate-in slide-in-from-left duration-300">
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-white dark:bg-neutral-950">
        <div className="flex items-center gap-2">
          {(!isAtRoot || selectedTag) && (
            <Button
              variant="bare"
              onClick={() => {
                if (selectedTag) {
                  setSelectedTag(null);
                } else {
                  navigateBack();
                }
              }}
              className="p-1 -ml-1"
            >
              <HiOutlineChevronLeft size={16} />
            </Button>
          )}
          <h2 className="text-[10px] uppercase tracking-widest font-bold opacity-50 truncate max-w-[120px]">
            {selectedTag ? `Tag: ${selectedTag}` : currentDirectoryHandle?.name || "Vault"}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="bare" onClick={createNewFile} title="New File">
            <HiOutlinePlus size={16} />
          </Button>
          {onClose && (
            <Button
              variant="bare"
              onClick={onClose}
              className="md:hidden"
              title="Close Sidebar"
            >
              <HiOutlineX size={16} />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {/* Smart Filters Section */}
        {!selectedTag && tags.length > 0 && (
          <div className="space-y-1">
            <h3 className="px-3 text-[9px] uppercase tracking-[0.2em] font-bold opacity-30 py-2">
              Smart Filters
            </h3>
            <div className="flex flex-wrap gap-1 px-3">
              {tags.map((tag) => (
                <span
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 cursor-pointer hover:bg-blue-500/20 transition-colors border border-blue-500/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Files Section */}
        <div className="space-y-1">
          {!selectedTag && (
            <h3 className="px-3 text-[9px] uppercase tracking-[0.2em] font-bold opacity-30 py-2">
              Files
            </h3>
          )}
          {(selectedTag ? filteredFiles : vaultFiles)?.map((entry) => (
            <div
              key={entry.name}
              className="group relative"
              onMouseLeave={() => setActionMenuOpen(null)}
            >
              <div
                onClick={() => {
                  if (entry.kind === "file") {
                    openFile(entry as FileSystemFileHandle);
                  } else {
                    navigateTo(entry as FileSystemDirectoryHandle);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors text-sm pr-10 ${
                  activeFileHandle?.name === entry.name
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium"
                    : "hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                }`}
              >
                {entry.kind === "file" ? (
                  <HiOutlineDocumentText size={16} className="shrink-0" />
                ) : (
                  <HiOutlineFolder size={16} className="shrink-0" />
                )}
                <span className="truncate">{entry.name}</span>
              </div>

              {!selectedTag && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                  <Button
                    variant="bare"
                    className="p-1.5 hover:bg-neutral-300 dark:hover:bg-neutral-700 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActionMenuOpen(
                        actionMenuOpen === entry.name ? null : entry.name,
                      );
                    }}
                  >
                    <HiOutlineDotsVertical size={14} className="opacity-60" />
                  </Button>
                </div>
              )}

              {actionMenuOpen === entry.name && (
                <div className="absolute right-0 top-full mt-[-4px] z-50 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl py-1 min-w-[120px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      renameFile(entry);
                      setActionMenuOpen(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <HiOutlinePencil size={14} className="opacity-60" />
                    Rename
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFile(entry);
                      setActionMenuOpen(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-red-500"
                  >
                    <HiOutlineTrash size={14} className="opacity-60" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}

          {(!selectedTag ? vaultFiles : filteredFiles)?.length === 0 && (
            <div className="p-4 text-center opacity-30 text-xs italic">
              Empty directory
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
