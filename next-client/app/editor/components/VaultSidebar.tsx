"use client";

import React, { useState, useMemo } from "react";
import { useFileSystem } from "@/app/hooks/use-file-system";
import {
  HiOutlineDocumentText,
  HiOutlineFolder,
  HiOutlineChevronLeft,
  HiOutlineX,
  HiOutlineDotsVertical,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineRefresh,
} from "react-icons/hi";
import Button from "@/app/components/Button";
import { useAtomValue } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_activeFilePath, atom_sidebarWidth } from "@/app/atoms/atoms";
import SmartFolders from "./SmartFolders";
import { useAtom } from "jotai";
import SidebarHeader from "./SidebarHeader";

interface VaultSidebarProps {
  onClose?: () => void;
}

export default function VaultSidebar({ onClose }: VaultSidebarProps) {
  const {
    vaultFiles,
    openFile,
    vaultHandle,
    currentDirectoryHandle,
    navigateTo,
    navigateBack,
    deleteFile,
    renameFile,
    isVaultPending,
    restoreVault,
    isVaultSupported,
    scanVault,
    indexVaultTags,
  } = useFileSystem();

  const fileMetadata = useAtomValue(atom_fileMetadata);
  const activeFilePath = useAtomValue(atom_activeFilePath);
  const [sidebarWidth, setSidebarWidth] = useAtom(atom_sidebarWidth);
  const [isResizing, setIsResizing] = useState(false);

  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isFilesExpanded, setIsFilesExpanded] = useState(true);
  const [isTagsExpanded, setIsTagsExpanded] = useState(true);

  // Resize handler
  const startResizing = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = React.useCallback((e: MouseEvent) => {
    if (isResizing) {
      // Calculate new width: mouse X - ribbon width (approx 80px)
      const newWidth = Math.max(200, Math.min(600, e.clientX - 80));
      setSidebarWidth(newWidth);
    }
  }, [isResizing, setSidebarWidth]);

  React.useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const vaultTags = useMemo(() => {
    const tagsMap: Record<string, any[]> = {};
    Object.values(fileMetadata).forEach((meta) => {
      meta.tags.forEach((tag) => {
        if (!tagsMap[tag]) tagsMap[tag] = [];
        tagsMap[tag].push(meta);
      });
    });
    return tagsMap;
  }, [fileMetadata]);

  if (!isVaultSupported) {
    return (
      <div className="w-64 flex flex-col items-center justify-center p-6 text-center h-full">
        <HiOutlineX size={48} className="opacity-20 mb-4 text-red-500" />
        <h2 className="text-xs font-bold tracking-widest opacity-50 mb-2">Vault Not Supported</h2>
        <p className="text-[10px] opacity-40 leading-relaxed">Your browser doesn't support the File System Access API. Please use Chrome, Edge, or Opera.</p>
      </div>
    );
  }

  if (!vaultHandle) return null;

  if (isVaultPending) {
    return (
      <div className="w-64 flex flex-col items-center justify-center p-6 text-center animate-in slide-in-from-left duration-300 h-full">
        <HiOutlineFolder size={48} className="opacity-20 mb-4" />
        <h2 className="text-xs font-bold tracking-widest opacity-50 mb-2">Vault Access Paused</h2>
        <p className="text-[10px] opacity-40 mb-6 leading-relaxed">Browser security requires re-authorization to access your local files after a refresh.</p>
        <Button variant="primary" onClick={restoreVault} className="w-full">
          Restore Access
        </Button>
      </div>
    );
  }

  const isAtRoot =
    !currentDirectoryHandle || vaultHandle.name === currentDirectoryHandle.name;

  const tags = Object.keys(vaultTags).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  const filteredFiles = selectedTag ? vaultTags[selectedTag] : null;

  return (
    <div 
      className="flex flex-col h-full animate-in slide-in-from-left duration-300 relative group/sidebar"
      style={{ width: `${sidebarWidth}px` }}
    >
      {/* Resize Handle */}
      <div
        onMouseDown={startResizing}
        className={`
          absolute top-0 right-0 bottom-0 w-1 cursor-col-resize z-[100]
          hover:bg-blue-500/30 transition-colors
          ${isResizing ? "bg-blue-500" : "bg-transparent"}
        `}
      />

      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-white dark:bg-neutral-950">
        <div className="flex items-center gap-2">
          {(!isAtRoot || selectedTag) && (
            <Button
              variant="icon"
              onClick={() => {
                if (selectedTag) {
                  setSelectedTag(null);
                } else {
                  navigateBack();
                }
              }}
              className="w-7 h-7 -ml-2"
            >
              <HiOutlineChevronLeft size={16} />
            </Button>
          )}
          <h2 className="text-[12px] font-bold opacity-80 truncate">
            {selectedTag ? `Tag: ${selectedTag}` : currentDirectoryHandle?.name || "Vault"}
          </h2>
        </div>
        <div className="flex items-center gap-0.5 relative">
          <Button
            variant="icon"
            className="w-8 h-8"
            onClick={async () => {
              const targetDir = currentDirectoryHandle || vaultHandle;
              if (targetDir) {
                await scanVault(targetDir);
                await indexVaultTags();
              }
            }}
            title="Refresh Vault"
          >
            <HiOutlineRefresh size={16} />
          </Button>

          {onClose && (
            <Button
              variant="icon"
              className="w-8 h-8 md:hidden"
              onClick={onClose}
              title="Close Sidebar"
            >
              <HiOutlineX size={16} />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-none p-2 space-y-4">
        {/* Files Section */}
        <div className="space-y-1">
          {!selectedTag && (
            <SidebarHeader
              title="Files"
              isExpanded={isFilesExpanded}
              onToggle={() => setIsFilesExpanded(!isFilesExpanded)}
            />
          )}
          {isFilesExpanded && (selectedTag ? filteredFiles : vaultFiles)?.map((entry, idx) => (
            <div
              key={`${entry.kind || 'file'}-${entry.name}-${idx}`}
              className="group relative"
              onMouseLeave={() => setActionMenuOpen(null)}
            >
              <div
                onClick={() => {
                  if (selectedTag) {
                    openFile(entry.handle, (entry as any).path);
                  } else if (entry.kind === "file") {
                    openFile(entry as FileSystemFileHandle);
                  } else {
                    navigateTo(entry as FileSystemDirectoryHandle);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors text-sm pr-10 ${
                  (selectedTag && (entry as any).path === activeFilePath) || (!selectedTag && activeFilePath?.split("/").pop() === entry.name)
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium"
                    : "hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                }`}
              >
                {entry.kind === "directory" ? (
                  <HiOutlineFolder size={16} className="shrink-0" />
                ) : (
                  <HiOutlineDocumentText size={16} className="shrink-0" />
                )}
                <span className="truncate">{entry.name}</span>
              </div>

              {!selectedTag && (
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                  <Button
                    variant="icon"
                    className="w-7 h-7 flex items-center justify-center"
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
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setActionMenuOpen(null)}
                  />
                  <div className="absolute right-2 top-3/4 z-50 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl py-1 min-w-[120px] animate-in fade-in zoom-in-95 duration-100">
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
                </>
              )}
            </div>
          ))}

          {(!selectedTag ? vaultFiles : filteredFiles)?.length === 0 && (
            <div className="p-4 text-center opacity-30 text-xs italic">
              Empty directory
            </div>
          )}
        </div>

        {/* Smart Filters Section */}
        {!selectedTag && tags.length > 0 && (
          <div className="space-y-1">
            <SidebarHeader
              title="Smart Filters"
              isExpanded={isTagsExpanded}
              onToggle={() => setIsTagsExpanded(!isTagsExpanded)}
            />
            
            {isTagsExpanded && (
              <div className="flex flex-wrap gap-1 px-3 max-h-40 overflow-y-auto overscroll-none custom-scrollbar animate-in fade-in duration-200">
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
            )}
          </div>
        )}

        {/* Workspaces Section */}
        {!selectedTag && (
          <SmartFolders
            onFileSelect={openFile}
          />
        )}
      </div>
    </div>
  );
}
