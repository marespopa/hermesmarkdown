"use client";

import React, { useState } from "react";
import { useFileSystem } from "@/app/hooks/use-file-system";
import {
  HiOutlineChevronLeft,
  HiOutlineCog,
  HiOutlineCloud,
  HiOutlineFolderAdd,
} from "react-icons/hi";
import { VscNewFile } from "react-icons/vsc";
import Button from "@/app/components/Button";
import { 
  atom_activeFilePath, 
  atom_sidebarWidth, 
  atom_isCloudVault,
  atom_isZenModeActive 
} from "@/app/atoms/atoms";
import { useAtom, useAtomValue } from "jotai";
import SmartFolders from "./SmartFolders";
import { useSidebarSearch } from "../hooks/useSidebarSearch";
import VaultSidebarEmpty from "./VaultSidebarEmpty";
import VaultSidebarFiles from "./VaultSidebarFiles";
import VaultSidebarFilters from "./VaultSidebarFilters";
import VaultSidebarFooter from "./VaultSidebarFooter";

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
  const {
    vaultFiles,
    openFile,
    vaultHandle,
    deleteFile,
    renameFile,
    moveItem,
    createNewFile,
    createNewFolder,
    closeVault,
    isMounted,
    openVault,
    isVaultSupported,
  } = useFileSystem();

  const [activeFilePath, setActiveFilePath] = useAtom(atom_activeFilePath);
  const [sidebarWidth, setSidebarWidth] = useAtom(atom_sidebarWidth);
  const isCloudVault = useAtomValue(atom_isCloudVault);
  const [isZenModeActive, setIsZenModeActive] = useAtom(atom_isZenModeActive);
  const [isResizing, setIsResizing] = useState(false);

  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isFilesExpanded, setIsFilesExpanded] = useState(true);
  const [isTagsExpanded, setIsTagsExpanded] = useState(true);

  const {
    searchQuery,
    setSearchQuery,
    tagSearchQuery,
    setTagSearchQuery,
    processedTags,
    processedFiles,
    tags,
  } = useSidebarSearch({ vaultFiles, selectedTag });

  // Resize logic
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
            {selectedTag && (
              <Button
                variant="icon"
                onClick={() => setSelectedTag(null)}
                className="w-10 h-10 -ml-2"
              >
                <HiOutlineChevronLeft size={20} />
              </Button>
            )}
            <h2 className="text-ui-title-3 font-semibold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
              {selectedTag ? `Tag: ${selectedTag}` : vaultHandle?.name || "Notes"}
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
                title={vaultHandle ? "New File" : "Open a folder to create files"}
              >
                <VscNewFile size={18} />
              </Button>
              <Button
                variant="icon"
                className="w-10 h-10 opacity-60 hover:opacity-100 text-zinc-600 dark:text-zinc-400"
                onClick={() => createNewFolder()}
                disabled={!vaultHandle}
                title={vaultHandle ? "New Folder" : "Open a folder to create folders"}
              >
                <HiOutlineFolderAdd size={18} />
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
                  className="w-10 h-10 opacity-60 hover:opacity-100"
                  onClick={onClose}
                  title="Collapse Sidebar"
                >
                  <HiOutlineChevronLeft size={18} />
                </Button>
              )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-none p-3 space-y-6 custom-scrollbar">
        {!vaultHandle ? (
          <VaultSidebarEmpty
            isVaultSupported={isVaultSupported}
            openVault={openVault}
            onImport={onImport}
            onExport={onExport}
            setActiveFilePath={setActiveFilePath}
            activeFilePath={activeFilePath}
            onClose={onClose}
          />
        ) : (
          <>
            <div className="rounded-2xl bg-zinc-100/60 dark:bg-zinc-800/30">
              <VaultSidebarFiles
                isFilesExpanded={isFilesExpanded}
                setIsFilesExpanded={setIsFilesExpanded}
                onNewFile={onNewFile}
                createNewFile={createNewFile}
                createNewFolder={createNewFolder}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                processedFiles={processedFiles}
                selectedTag={selectedTag}
                activeFilePath={activeFilePath}
                openFile={openFile}
                renameFile={renameFile}
                deleteFile={deleteFile}
                moveItem={moveItem}
                onClose={onClose}
                vaultHandle={vaultHandle}
              />
            </div>

            <div className="rounded-2xl bg-zinc-100/60 dark:bg-zinc-800/30">
              <VaultSidebarFilters
                selectedTag={selectedTag}
                setSelectedTag={setSelectedTag}
                tags={tags}
                isTagsExpanded={isTagsExpanded}
                setIsTagsExpanded={setIsTagsExpanded}
                tagSearchQuery={tagSearchQuery}
                setTagSearchQuery={setTagSearchQuery}
                processedTags={processedTags}
              />
            </div>
          </>
        )}

        {!selectedTag && (
          <div className="rounded-2xl bg-zinc-100/60 dark:bg-zinc-800/30">
            <SmartFolders
              onFileSelect={(handle, path) => {
                openFile(handle, path);
                if (onClose && window.innerWidth < 1024) onClose();
              }}
            />
          </div>
        )}
      </div>

      <VaultSidebarFooter
        onOpenSettings={onOpenSettings}
        isZenModeActive={isZenModeActive}
        setIsZenModeActive={setIsZenModeActive}
        vaultHandle={vaultHandle}
        closeVault={closeVault}
        openVault={openVault}
        isVaultSupported={isVaultSupported}
      />
    </div>
  );
}
