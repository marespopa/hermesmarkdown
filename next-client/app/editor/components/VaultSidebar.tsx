"use client";

import React, { useState } from "react";
import { useFileSystem } from "@/app/hooks/use-file-system";
import {
  HiOutlineChevronLeft,
  HiOutlineCog,
  HiOutlineCloud,
} from "react-icons/hi";
import Button from "@/app/components/Button";
import {
  atom_activeFilePath,
  atom_sidebarWidth,
  atom_isCloudVault,
  atom_isZenModeActive,
  atom_sidebarTabOrder,
  SidebarTab
} from "@/app/atoms/atoms";
import { useAtom, useAtomValue } from "jotai";
import SmartFolders from "./SmartFolders";
import { useSidebarSearch } from "../hooks/useSidebarSearch";
import VaultSidebarEmpty from "./VaultSidebarEmpty";
import VaultSidebarFiles from "./VaultSidebarFiles";
import VaultSidebarFooter from "./VaultSidebarFooter";
import UnifiedSearchInput from "./UnifiedSearchInput";

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
    openFile,
    vaultHandle,
    deleteFile,
    renameFile,
    closeVault,
    isMounted,
    openVault,
    isVaultSupported,
  } = useFileSystem();

  const [activeFilePath, setActiveFilePath] = useAtom(atom_activeFilePath);
  const [sidebarWidth, setSidebarWidth] = useAtom(atom_sidebarWidth);
  const isCloudVault = useAtomValue(atom_isCloudVault);
  const tabOrder = useAtomValue(atom_sidebarTabOrder);
  const [isZenModeActive, setIsZenModeActive] = useAtom(atom_isZenModeActive);
  const [isResizing, setIsResizing] = useState(false);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<SidebarTab>(tabOrder[0] || "content");
  const [viewMatchCount, setViewMatchCount] = useState(0);
  const [viewHasFolderSelected, setViewHasFolderSelected] = useState(false);

  const {
    searchQuery,
    setSearchQuery,
    processedFiles,
    tags,
  } = useSidebarSearch({ selectedTags });

  const isSearching = searchQuery.trim().length > 0 || selectedTags.length > 0;
  const showAllFiles = activeTab === "content" || (isSearching && (!viewHasFolderSelected || viewMatchCount === 0));

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
      className="flex flex-col h-full animate-in slide-in-from-left duration-700 relative group/sidebar paper-grain backdrop-blur-3xl bg-paper-light/70 dark:bg-paper-dark/70 border-r border-zinc-200/50 dark:border-zinc-800/50"
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

      {/* Header */}
      <div className="p-4 flex flex-col gap-2 shrink-0">
        <div className="flex justify-between items-center h-10">
          <div className="flex items-center gap-2">
            <h2 className="text-ui-title-3 font-semibold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
              {vaultHandle?.name || "Notes"}
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
                className="w-10 h-10 opacity-60 hover:opacity-100 md:hidden"
                onClick={onOpenSettings}
                title="Settings"
                aria-label="Settings"
              >
                <HiOutlineCog size={18} />
              </Button>

              {onClose && (
                <Button
                  variant="icon"
                  className="w-10 h-10 opacity-60 hover:opacity-100"
                  onClick={onClose}
                  title="Collapse Sidebar"
                  aria-label="Collapse Sidebar"
                >
                  <HiOutlineChevronLeft size={18} />
                </Button>
              )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {!vaultHandle ? (
          <div className="flex-1 overflow-y-auto overscroll-none p-3 custom-scrollbar">
            <VaultSidebarEmpty
              isVaultSupported={isVaultSupported}
              openVault={openVault}
              onImport={onImport}
              onExport={onExport}
              setActiveFilePath={setActiveFilePath}
              activeFilePath={activeFilePath}
              onClose={onClose}
            />
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Unified search - always visible */}
            <div className="px-3 pt-3 pb-2 shrink-0">
              <UnifiedSearchInput
                tokens={selectedTags}
                text={searchQuery}
                allTags={tags}
                onTokenAdd={(tag) => setSelectedTags(prev => prev.includes(tag) ? prev : [...prev, tag])}
                onTokenRemove={(tag) => setSelectedTags(prev => prev.filter(t => t !== tag))}
                onTextChange={setSearchQuery}
              />
            </div>

            <div className="flex px-4 pt-1 pb-3 gap-6 shrink-0 border-b border-zinc-200/40 dark:border-zinc-800/40">
              {tabOrder.map((tab) => (
                <Button
                  key={tab}
                  variant="bare"
                  onClick={() => setActiveTab(tab)}
                  className={`text-sm font-semibold tracking-wide transition-colors ${activeTab === tab ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400"}`}
                >
                  {tab === "content" ? "Content" : "Views"}
                </Button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden flex flex-col pt-3">
              {showAllFiles && activeTab === "views" && (
                <p className="px-4 pb-1 text-ui-caption text-zinc-400 dark:text-zinc-600 shrink-0">
                  Searching all files
                </p>
              )}
              {showAllFiles ? (
                <VaultSidebarFiles
                  onNewFile={onNewFile}
                  processedFiles={processedFiles}
                  activeFilePath={activeFilePath}
                  openFile={openFile}
                  renameFile={renameFile}
                  deleteFile={deleteFile}
                  onClose={onClose}
                  isSearchActive={isSearching}
                />
              ) : (
                <div className="flex-1 overflow-y-auto">
                  <SmartFolders
                    onFileSelect={(handle, path) => {
                      openFile(handle, path);
                      if (onClose && window.innerWidth < 1024) onClose();
                    }}
                    renameFile={renameFile}
                    deleteFile={deleteFile}
                    searchQuery={searchQuery}
                    selectedTags={selectedTags}
                    onMatchCountChange={(count, hasFolderSelected) => {
                      setViewMatchCount(count);
                      setViewHasFolderSelected(hasFolderSelected);
                    }}
                  />
                </div>
              )}
            </div>
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
