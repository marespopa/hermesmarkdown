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
  HiOutlinePlus,
  HiOutlineCog,
  HiOutlineHome,
  HiOutlineLogout,
  HiOutlineDatabase,
  HiOutlineCloudDownload,
  HiOutlineCloudUpload,
} from "react-icons/hi";
import { VscNewFile } from "react-icons/vsc";
import Button from "@/app/components/Button";
import { useAtomValue } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_activeFilePath, atom_sidebarWidth } from "@/app/atoms/atoms";
import SmartFolders from "./SmartFolders";
import { useAtom } from "jotai";
import SidebarHeader from "./SidebarHeader";
import { useRouter } from "next/navigation";

interface VaultSidebarProps {
  onClose?: () => void;
  onOpenSettings?: () => void;
  onNewFile?: () => void;
  onImport?: () => void;
  onExport?: () => void;
}

export default function VaultSidebar({ 
  onClose, 
  onOpenSettings, 
  onNewFile,
  onImport,
  onExport,
}: VaultSidebarProps) {
  const router = useRouter();
  const {
    vaultFiles,
    openFile,
    vaultHandle,
    currentDirectoryHandle,
    navigateTo,
    navigateBack,
    deleteFile,
    renameFile,
    createNewFile,
    isVaultPending,
    restoreVault,
    isVaultSupported,
    openVault,
    closeVault,
    isMounted,
  } = useFileSystem();

  const fileMetadata = useAtomValue(atom_fileMetadata);
  const [activeFilePath, setActiveFilePath] = useAtom(atom_activeFilePath);
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
      const newWidth = Math.max(200, Math.min(600, e.clientX));
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

  const isAtRoot =
    !currentDirectoryHandle || (vaultHandle && vaultHandle.name === currentDirectoryHandle.name);

  const tags = Object.keys(vaultTags).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  const filteredFiles = selectedTag ? vaultTags[selectedTag] : null;

  if (!isMounted) return null;

  return (
    <div 
      className="flex flex-col h-full animate-in slide-in-from-left duration-300 relative group/sidebar bg-neutral-50/50 dark:bg-neutral-950/50"
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

      {/* Apple Notes Style Header -> Premium Minimal Header */}
      <div className="p-3 flex flex-col gap-2 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            {(!isAtRoot || selectedTag) && vaultHandle && (
              <Button
                variant="icon"
                onClick={() => {
                  if (selectedTag) {
                    setSelectedTag(null);
                  } else {
                    navigateBack();
                  }
                }}
                className="w-7 h-7 -ml-1.5"
              >
                <HiOutlineChevronLeft size={16} />
              </Button>
            )}
            <h2 className="text-[13px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {selectedTag ? `Tag: ${selectedTag}` : currentDirectoryHandle?.name || (vaultHandle ? "Notes" : "HermesMarkdown")}
            </h2>
          </div>
          
          <div className="flex items-center gap-0.5">
             <Button
                variant="icon"
                className="w-8 h-8 opacity-60 hover:opacity-100 text-zinc-600 dark:text-zinc-400"
                onClick={onNewFile}
                disabled={!vaultHandle}
                title={vaultHandle ? "New Note" : "Open a folder to create files"}
              >
                <VscNewFile size={16} />
              </Button>
              
              {onClose && (
                <Button
                  variant="icon"
                  className="w-8 h-8 opacity-60 hover:opacity-100"
                  onClick={onClose}
                  title="Close Sidebar"
                >
                  <HiOutlineX size={16} />
                </Button>
              )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-none p-2 space-y-4 custom-scrollbar">
        {!vaultHandle ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <SidebarHeader title="Locations" isExpanded={true} onToggle={() => {}} />
              
              {isVaultSupported ? (
                <div 
                  onClick={openVault}
                  className="flex items-center gap-2 px-4 py-2 rounded-md cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800/50 transition-colors text-[13px] text-zinc-600 dark:text-zinc-400"
                >
                  <HiOutlineDatabase size={16} />
                  <span>Open Folder</span>
                </div>
              ) : (
                <div className="px-4 py-3 rounded-md bg-amber-500/5 border border-amber-500/10 mb-2">
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-relaxed font-medium">
                    Vaults require Chrome/Edge on Desktop.
                  </p>
                </div>
              )}

              <div 
                onClick={() => {
                   setActiveFilePath("draft");
                   if (onClose && window.innerWidth < 768) onClose();
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-md cursor-pointer transition-all text-[13px] relative ${activeFilePath === 'draft' ? "text-blue-600 dark:text-blue-400 font-medium before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-500 bg-blue-500/5" : "hover:bg-zinc-200 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400"}`}
              >
                <HiOutlineDocumentText size={16} />
                <span>Draft Mode</span>
              </div>
            </div>

            <div className="space-y-1">
              <SidebarHeader title="Actions" isExpanded={true} onToggle={() => {}} />
              <div 
                onClick={onImport}
                className="flex items-center gap-2 px-4 py-2 rounded-md cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800/50 transition-colors text-[13px] text-zinc-600 dark:text-zinc-400"
              >
                <HiOutlineCloudDownload size={16} />
                <span>Import Markdown</span>
              </div>
              <div 
                onClick={onExport}
                className="flex items-center gap-2 px-4 py-2 rounded-md cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800/50 transition-colors text-[13px] text-zinc-600 dark:text-zinc-400"
              >
                <HiOutlineCloudUpload size={16} />
                <span>Export Markdown</span>
              </div>
            </div>
          </div>
        ) : isVaultPending ? (
          <div className="flex flex-col items-center justify-center p-6 text-center animate-in slide-in-from-left duration-300 h-full">
            <HiOutlineFolder size={48} className="opacity-20 mb-4" />
            <h2 className="text-xs font-bold tracking-widest opacity-50 mb-2">Vault Access Paused</h2>
            <p className="text-[10px] opacity-40 mb-6 leading-relaxed">Browser security requires re-authorization to access your local files after a refresh.</p>
            <Button variant="primary" onClick={restoreVault} className="w-full">
              Restore Access
            </Button>
          </div>
        ) : (
          <>
            {/* Files Section */}
            <div className="space-y-1">
              {!selectedTag && (
                <SidebarHeader
                  title="Files"
                  isExpanded={isFilesExpanded}
                  onToggle={() => setIsFilesExpanded(!isFilesExpanded)}
                  action={
                    <Button
                      variant="icon"
                      className="w-5 h-5 opacity-30 hover:opacity-100"
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
                      <HiOutlinePlus size={12} />
                    </Button>
                  }
                />
              )}
              {isFilesExpanded && (selectedTag ? filteredFiles : vaultFiles)?.map((entry, idx) => {
                const isActive = (selectedTag && (entry as any).path === activeFilePath) || (!selectedTag && activeFilePath?.split("/").pop() === entry.name);
                return (
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
                      className={`flex items-center gap-2 px-4 py-1.5 rounded-md cursor-pointer transition-all text-[13px] pr-10 relative ${
                        isActive
                          ? "text-blue-600 dark:text-blue-400 font-medium before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-blue-500 bg-blue-500/5"
                          : "hover:bg-zinc-200 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {entry.kind === "directory" ? (
                        <HiOutlineFolder size={16} className="shrink-0 opacity-70" />
                      ) : (
                        <HiOutlineDocumentText size={16} className="shrink-0 opacity-70" />
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
              )})}

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
          </>
        )}

        {/* Workspaces Section (Always visible if not in tag view) */}
        {!selectedTag && (
          <SmartFolders
            onFileSelect={openFile}
          />
        )}
      </div>

      {/* Global Actions Footer */}
      <div className="p-2 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-100/30 dark:bg-neutral-900/30 shrink-0">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              <Button
                variant="icon"
                onClick={() => router.push("/")}
                className="w-8 h-8 opacity-60 hover:opacity-100"
                title="Go Home"
              >
                <HiOutlineHome size={18} />
              </Button>

              <Button
                variant="icon"
                onClick={onOpenSettings}
                className="w-8 h-8 opacity-60 hover:opacity-100"
                title="Settings"
              >
                <HiOutlineCog size={18} />
              </Button>
            </div>

            <div className="flex items-center gap-1">
               {vaultHandle ? (
                  <Button
                    variant="icon"
                    onClick={closeVault}
                    className="w-8 h-8 text-red-500/60 hover:text-red-500"
                    title="Close Vault"
                  >
                    <HiOutlineLogout size={18} />
                  </Button>
               ) : (
                  <Button
                    variant="icon"
                    onClick={openVault}
                    disabled={!isVaultSupported}
                    className="w-8 h-8 text-blue-500/60 hover:text-blue-500"
                    title={isVaultSupported ? "Open Vault" : "Vault not supported"}
                  >
                    <HiOutlineDatabase size={18} />
                  </Button>
               )}
            </div>
          </div>
      </div>
    </div>
  );
}
