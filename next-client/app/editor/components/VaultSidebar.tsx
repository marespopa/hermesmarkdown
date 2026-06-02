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
  HiOutlineCloud,
} from "react-icons/hi";
import { VscNewFile } from "react-icons/vsc";
import Button from "@/app/components/Button";
import { useAtomValue } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_activeFilePath, atom_sidebarWidth, atom_isCloudVault } from "@/app/atoms/atoms";
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
  const isCloudVault = useAtomValue(atom_isCloudVault);
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

  const [searchQuery, setSearchQuery] = useState("");
  const [tagSearchQuery, setTagSearchQuery] = useState("");

  const processedTags = useMemo(() => {
    if (!tagSearchQuery.trim()) return tags;
    const query = tagSearchQuery.toLowerCase().trim();
    return tags.filter(tag => tag.toLowerCase().includes(query));
  }, [tags, tagSearchQuery]);

  const processedFiles = useMemo(() => {
    // Global search across all indexed files if searching and not in tag view
    if (!selectedTag && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      
      // 1. Get matching files from global metadata
      const globalMatches = Object.values(fileMetadata)
        .filter(meta => 
          meta.name.toLowerCase().includes(query) || 
          meta.path.toLowerCase().includes(query)
        )
        .map(meta => ({
          name: meta.name,
          kind: "file",
          handle: meta.handle,
          path: meta.path
        }));

      // 2. Get matching folders from current directory (vaultFiles)
      // Note: We only have a global index of files, so folders can only be searched locally for now
      const folderMatches = vaultFiles
        .filter(entry => 
          entry.kind === "directory" && 
          entry.name.toLowerCase().includes(query)
        )
        .map(entry => ({
          name: entry.name,
          kind: "directory",
          handle: entry as FileSystemDirectoryHandle,
        }));

      // Combine and sort
      return [...folderMatches, ...globalMatches].sort((a, b) => {
        if (a.kind === "directory" && b.kind === "file") return -1;
        if (a.kind === "file" && b.kind === "directory") return 1;
        return a.name.localeCompare(b.name);
      });
    }

    const files = selectedTag ? filteredFiles : vaultFiles;
    if (!files) return [];

    // Sort: Folders first, then alphabetical by name
    let result = [...files].sort((a: any, b: any) => {
      const aIsFolder = a.kind === "directory";
      const bIsFolder = b.kind === "directory";
      
      if (aIsFolder && !bIsFolder) return -1;
      if (!aIsFolder && bIsFolder) return 1;
      
      return a.name.localeCompare(b.name);
    });

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((file: any) => 
        file.name.toLowerCase().includes(query)
      );
    }

    return result;
  }, [selectedTag, filteredFiles, vaultFiles, searchQuery, fileMetadata]);

  if (!isMounted) return null;

  return (
    <div 
      className="flex flex-col h-full animate-in slide-in-from-left duration-700 relative group/sidebar backdrop-blur-3xl bg-white/70 dark:bg-zinc-900/70 border-r border-zinc-200/50 dark:border-zinc-800/50"
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

      {/* Premium Minimal Header */}
      <div className="p-4 flex flex-col gap-2 shrink-0">
        <div className="flex justify-between items-center h-10">
          <div className="flex items-center gap-2">
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
                className="w-10 h-10 -ml-2"
              >
                <HiOutlineChevronLeft size={20} />
              </Button>
            )}
            <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
              {selectedTag ? `Tag: ${selectedTag}` : currentDirectoryHandle?.name || (vaultHandle ? "Notes" : "HermesMarkdown")}
              {isCloudVault && vaultHandle && (
                <span title="Cloud sync detected. HermesMarkdown will use enhanced error recovery if files are locked." className="text-blue-500/60 dark:text-blue-400/60 cursor-help">
                  <HiOutlineCloud size={14} />
                </span>
              )}
            </h2>
          </div>
          
          <div className="flex items-center gap-1">
             <Button
                variant="icon"
                className="w-10 h-10 opacity-60 hover:opacity-100 text-zinc-600 dark:text-zinc-400"
                onClick={onNewFile}
                disabled={!vaultHandle}
                title={vaultHandle ? "New Note" : "Open a folder to create files"}
              >
                <VscNewFile size={18} />
              </Button>

              <Button
                variant="icon"
                className="w-10 h-10 opacity-60 hover:opacity-100 md:hidden"
                onClick={onOpenSettings}
                title="Settings"
              >
                <HiOutlineCog size={18} />
              </Button>
              
              {onClose && (
                <Button
                  variant="icon"
                  className="w-10 h-10 opacity-60 hover:opacity-100 lg:hidden"
                  onClick={onClose}
                  title="Close Sidebar"
                >
                  <HiOutlineX size={18} />
                </Button>
              )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-none p-3 space-y-6 custom-scrollbar">
        {!vaultHandle ? (
          <div className="space-y-6">
            <div className="space-y-1">
              <SidebarHeader title="Locations" isExpanded={true} onToggle={() => {}} />
              
              {isVaultSupported ? (
                <div 
                  onClick={openVault}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 transition-colors text-sm text-zinc-600 dark:text-zinc-400 font-medium"
                >
                  <HiOutlineDatabase size={18} />
                  <span>Open Folder</span>
                </div>
              ) : (
                <div className="px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/10 mb-2">
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed font-bold uppercase tracking-wider">
                    Vaults require Desktop.
                  </p>
                </div>
              )}

              <div 
                onClick={() => {
                   setActiveFilePath("draft");
                   if (onClose && window.innerWidth < 1024) onClose();
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all text-sm relative ${activeFilePath === 'draft' ? "text-blue-600 dark:text-blue-400 font-bold bg-blue-500/10" : "hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400 font-medium"}`}
              >
                <HiOutlineDocumentText size={18} />
                <span>Draft Mode</span>
              </div>
            </div>

            <div className="space-y-1">
              <SidebarHeader title="Actions" isExpanded={true} onToggle={() => {}} />
              <div 
                onClick={onImport}
                className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 transition-colors text-sm text-zinc-600 dark:text-zinc-400 font-medium"
              >
                <HiOutlineCloudDownload size={18} />
                <span>Import Markdown</span>
              </div>
              <div 
                onClick={onExport}
                className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 transition-colors text-sm text-zinc-600 dark:text-zinc-400 font-medium"
              >
                <HiOutlineCloudUpload size={18} />
                <span>Export Markdown</span>
              </div>
            </div>
          </div>
        ) : isVaultPending ? (
          <div className="flex flex-col items-center justify-center p-8 text-center animate-in slide-in-from-left duration-700 h-full">
            <HiOutlineFolder size={56} className="opacity-10 mb-6" />
            <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50 mb-3">Vault Access Paused</h2>
            <p className="text-[11px] opacity-40 mb-8 leading-relaxed px-4">Browser security requires re-authorization to access your local files.</p>
            <Button variant="primary" onClick={restoreVault} className="w-full h-11 rounded-xl">
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
                      className="w-full bg-zinc-200/40 dark:bg-zinc-800/40 border-none rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-zinc-400 font-medium"
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
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-all text-sm pr-12 relative ${
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
                          <span className="text-[10px] opacity-40 truncate mt-0.5">
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
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
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
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-red-500"
                        >
                          <HiOutlineTrash size={16} className="opacity-60" />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )})}

              {isFilesExpanded && processedFiles.length === 0 && (
                <div className="p-8 text-center opacity-30 text-[11px] font-medium italic">
                  {searchQuery ? "No results found" : "Empty directory"}
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
                  <div className="space-y-3 animate-in fade-in duration-300">
                    {tags.length > 5 && (
                      <div className="px-1 mb-2">
                        <div className="relative group/search">
                          <input
                            type="text"
                            value={tagSearchQuery}
                            onChange={(e) => setTagSearchQuery(e.target.value)}
                            placeholder="Search filters..."
                            className="w-full bg-zinc-200/40 dark:bg-zinc-800/40 border-none rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-zinc-400 font-medium"
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-2 px-2 max-h-48 overflow-y-auto overscroll-none custom-scrollbar">
                      {processedTags.map((tag) => (
                        <span
                          key={tag}
                          onClick={() => setSelectedTag(tag)}
                          className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 cursor-pointer hover:bg-blue-500/20 transition-all border border-blue-500/20 active:scale-95"
                        >
                          {tag.startsWith("#") ? tag : `#${tag}`}
                        </span>
                      ))}

                      {tagSearchQuery && processedTags.length === 0 && (
                        <div className="w-full py-4 text-center opacity-30 text-[11px] font-medium italic">
                          No filters found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Workspaces Section (Always visible if not in tag view) */}
        {!selectedTag && (
          <div className="pt-2">
            <SmartFolders
              onFileSelect={(handle, path) => {
                openFile(handle, path);
                if (onClose && window.innerWidth < 1024) onClose();
              }}
            />
          </div>
        )}
      </div>

      {/* Global Actions Footer */}
      <div className="p-4 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-900/40 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button
                variant="icon"
                onClick={() => router.push("/")}
                className="w-10 h-10 opacity-60 hover:opacity-100"
                title="Go Home"
              >
                <HiOutlineHome size={20} />
              </Button>

              <Button
                variant="icon"
                onClick={onOpenSettings}
                className="w-10 h-10 opacity-60 hover:opacity-100"
                title="Settings"
              >
                <HiOutlineCog size={20} />
              </Button>
            </div>

            <div className="flex items-center gap-1">
               {vaultHandle ? (
                  <Button
                    variant="icon"
                    onClick={closeVault}
                    className="w-10 h-10 text-red-500/60 hover:text-red-500"
                    title="Close Vault"
                  >
                    <HiOutlineLogout size={20} />
                  </Button>
               ) : (
                  <Button
                    variant="icon"
                    onClick={openVault}
                    disabled={!isVaultSupported}
                    className="w-10 h-10 text-blue-500/60 hover:text-blue-500"
                    title={isVaultSupported ? "Open Vault" : "Vault not supported"}
                  >
                    <HiOutlineDatabase size={20} />
                  </Button>
               )}
            </div>
          </div>
      </div>
    </div>
  );
}
