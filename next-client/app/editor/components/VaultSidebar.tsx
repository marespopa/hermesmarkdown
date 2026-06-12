"use client";

import React, { useState, useCallback } from "react";
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
import DriveAuthBanner from "./DriveAuthBanner";
import GoogleDriveFolderPicker from "./GoogleDriveFolderPicker";
import { atom_driveVaultName } from "@/app/atoms/drive-atoms";
import { HiOutlineRefresh } from "react-icons/hi";

function DriveExpiredPanel({ vaultName, onReconnect }: { vaultName: string | null; onReconnect: () => void }) {
  const [isConnecting, setIsConnecting] = React.useState(false);

  const handleReconnect = () => {
    setIsConnecting(true);
    onReconnect();
  };

  return (
    <div className="space-y-3 px-1">
      <p className="text-ui-footnote text-ink-muted dark:text-stone leading-relaxed">
        Your Google Drive vault{vaultName ? ` "${vaultName}"` : ""} needs to reconnect.
      </p>
      <Button
        variant="primary"
        onClick={handleReconnect}
        isDisabled={isConnecting}
        className="w-full"
      >
        <HiOutlineRefresh size={14} className={isConnecting ? "animate-spin" : ""} />
        {isConnecting ? "Connecting…" : "Reconnect Google Drive"}
      </Button>
    </div>
  );
}

interface VaultSidebarProps {
  onClose?: () => void;
  onOpenSettings?: () => void;
  onNewFile?: () => void;
  onNewAIFile?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  onRefresh?: () => Promise<void>;
}

export default function VaultSidebar({
  onClose,
  onOpenSettings,
  onNewFile,
  onNewAIFile,
  onImport,
  onExport,
  onRefresh,
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
    isDriveVault,
    openDriveVault,
    driveAuthState,
    driveSignIn,
  } = useFileSystem();

  const [activeFilePath, setActiveFilePath] = useAtom(atom_activeFilePath);
  const [sidebarWidth, setSidebarWidth] = useAtom(atom_sidebarWidth);
  const isCloudVault = useAtomValue(atom_isCloudVault);
  const tabOrder = useAtomValue(atom_sidebarTabOrder);
  const driveVaultName = useAtomValue(atom_driveVaultName);
  const [isZenModeActive, setIsZenModeActive] = useAtom(atom_isZenModeActive);
  const [isResizing, setIsResizing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing || !vaultHandle) return;
    setIsRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, vaultHandle, onRefresh]);

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
      className="flex flex-col h-full animate-in slide-in-from-left duration-500 ease-out relative group/sidebar paper-grain bg-paper-pale dark:bg-paper-dark border-r border-edge-subtle"
      style={{ width: `${sidebarWidth}px` }}
    >
      {/* Resize Handle */}
      <div
        onMouseDown={startResizing}
        className={`
          absolute top-0 right-0 bottom-0 w-1 cursor-col-resize z-[100]
          hover:bg-sage/20 transition-colors
          ${isResizing ? "bg-sage/40" : "bg-transparent"}
        `}
      />

      {/* Header */}
      <div className="p-3 flex flex-col gap-2 shrink-0">
        <div className="flex justify-between items-center h-11 md:h-8">
          <div className="flex items-center gap-2">
            <h2 className="text-ui-body md:text-ui-subhead font-medium text-ink-light dark:text-ink-dark opacity-80 md:opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1.5 min-w-0">
              <span className="truncate">{vaultHandle?.name || driveVaultName || "Notes"}</span>
              {isDriveVault && (
                <span title="Google Drive vault" className="shrink-0 cursor-help opacity-70 -mt-2">
                  <svg width="10" height="9" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0a7.3 7.3 0 0 0 1.1 3.85z" fill="#0066da"/>
                    <path d="M43.65 25L29.9 1.2A7.2 7.2 0 0 0 26.6 4.5L1.1 49.15A7.3 7.3 0 0 0 0 53h27.5z" fill="#00ac47"/>
                    <path d="M73.55 76.8a7.2 7.2 0 0 0 3.3-3.3l1.6-2.75 7.65-13.25A7.3 7.3 0 0 0 87.3 53H59.8L73.55 76.8z" fill="#ea4335"/>
                    <path d="M43.65 25L57.4 1.2A7.35 7.35 0 0 0 53.65 0h-20a7.35 7.35 0 0 0-3.75 1.2z" fill="#00832d"/>
                    <path d="M59.8 53H87.3a7.3 7.3 0 0 0-1.1-3.85L60.7 4.5a7.2 7.2 0 0 0-3.3-3.3L43.65 25z" fill="#2684fc"/>
                    <path d="M27.5 53L13.75 76.8a7.35 7.35 0 0 0 3.75 1.2h52.3a7.35 7.35 0 0 0 3.75-1.2L59.8 53z" fill="#ffba00"/>
                  </svg>
                </span>
              )}
              {isCloudVault && vaultHandle && (
                <span title="Cloud sync detected. HermesMarkdown will use enhanced error recovery if files are locked." className="shrink-0 text-sage/60 dark:text-sage/60 cursor-help">
                  <HiOutlineCloud size={14} />
                </span>
              )}
            </h2>
          </div>

          <div className="flex items-center gap-1">
              {vaultHandle && (
                <Button
                  variant="icon"
                  className="w-10 h-10 opacity-80 hover:opacity-100"
                  onClick={handleRefresh}
                  title="Refresh vault"
                  aria-label="Refresh vault"
                  disabled={isRefreshing}
                >
                  <HiOutlineRefresh size={18} className={isRefreshing ? "animate-spin" : ""} />
                </Button>
              )}

              <Button
                variant="icon"
                className="w-10 h-10 opacity-80 hover:opacity-100 md:hidden"
                onClick={onOpenSettings}
                title="Settings"
                aria-label="Settings"
              >
                <HiOutlineCog size={18} />
              </Button>

              {onClose && (
                <Button
                  variant="icon"
                  className="w-10 h-10 opacity-80 hover:opacity-100"
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
            {isDriveVault && driveAuthState === 'expired' ? (
              <DriveExpiredPanel vaultName={driveVaultName} onReconnect={driveSignIn} />
            ) : (
              <VaultSidebarEmpty
                isVaultSupported={isVaultSupported}
                openVault={openVault}
                onImport={onImport}
                onExport={onExport}
                setActiveFilePath={setActiveFilePath}
                activeFilePath={activeFilePath}
                onClose={onClose}
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Unified search - always visible */}
            <div className="px-3 pt-3 pb-2 shrink-0 border-b border-edge-subtle">
              <UnifiedSearchInput
                tokens={selectedTags}
                text={searchQuery}
                allTags={tags}
                onTokenAdd={(tag) => setSelectedTags(prev => prev.includes(tag) ? prev : [...prev, tag])}
                onTokenRemove={(tag) => setSelectedTags(prev => prev.filter(t => t !== tag))}
                onTextChange={setSearchQuery}
              />
            </div>

            <div className="px-4 py-2 shrink-0 border-b border-edge-subtle">
              <div className="relative flex bg-paper-softgray/80 dark:bg-paper-dark/60 rounded-lg p-0.5 gap-0.5">
                {tabOrder.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`
                      relative flex-1 py-1.5 text-xs font-semibold tracking-wide rounded-md
                      transition-all duration-200 ease-out cursor-pointer
                      ${activeTab === tab
                        ? "bg-paper-light dark:bg-paper-dark-surface text-ink-light dark:text-ink-dark shadow-md shadow-beige dark:shadow-black/60"
                        : "text-stone hover:text-ink-muted dark:hover:text-ink-dark"
                      }
                    `}
                  >
                    {tab === "content" ? "Content" : "Views"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col pt-3">
              {showAllFiles && activeTab === "views" && (
                <p className="px-4 pb-1 text-ui-caption text-stone dark:text-fg-faint shrink-0">
                  Searching all files
                </p>
              )}
              {showAllFiles ? (
                <VaultSidebarFiles
                  onNewFile={onNewFile}
                  onNewAIFile={onNewAIFile}
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
                    onNewFile={onNewFile}
                    onNewAIFile={onNewAIFile}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {isDriveVault && vaultHandle && driveAuthState === 'expired' && (
        <DriveAuthBanner onReconnect={driveSignIn} />
      )}

      <VaultSidebarFooter
        onOpenSettings={onOpenSettings}
        isZenModeActive={isZenModeActive}
        setIsZenModeActive={setIsZenModeActive}
        vaultHandle={vaultHandle}
        closeVault={closeVault}
        openVault={openVault}
        isVaultSupported={isVaultSupported}
      />

      <GoogleDriveFolderPicker onSelect={openDriveVault} />
    </div>
  );
}
