"use client";

import React, { useState, useCallback } from "react";
import Portal from "@/app/components/Portal/Portal";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { atom_activeFilePath } from "@/app/atoms/atoms";
import { atom_drivePathIndex } from "@/app/atoms/drive-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useSidebarSearch } from "../hooks/useSidebarSearch";
import SmartFolders from "./SmartFolders";
import VaultSidebarFiles from "./VaultSidebarFiles";
import VaultSidebarEmpty from "./VaultSidebarEmpty";
import UnifiedSearchInput from "./UnifiedSearchInput";
import { HiOutlineX } from "react-icons/hi";
import { useBackButtonClose } from "@/app/hooks/use-back-button-close";
import { DriveDirectoryHandle } from "@/app/services/drive/DriveDirectoryHandle";
import { atom_newVaultFlowOpen } from "@/app/atoms/ui-atoms";

export default function MobileFileOverlay({
  isOpen,
  onClose,
  onImport,
  onExport,
}: {
  isOpen: boolean;
  onClose: () => void;
  onImport?: () => void;
  onExport?: () => void;
}) {
  const {
    openFile,
    renameFile,
    deleteFile,
    duplicateFile,
    moveItem,
    createNewFile,
    vaultHandle,
    isDriveVault,
    openVault,
    isVaultSupported,
    openDriveVaultPicker,
  } = useFileSystem();
  const [activeFilePath, setActiveFilePath] = useAtom(atom_activeFilePath);
  const drivePathIndex = useAtomValue(atom_drivePathIndex);
  const setNewVaultFlowOpen = useSetAtom(atom_newVaultFlowOpen);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"files" | "views">("files");
  const { searchQuery, setSearchQuery, processedFiles, totalResultsCount, hasMoreResults, setShowAllResults, allFiles, tags } =
    useSidebarSearch({ selectedTags, panel: "search" });
  const isSearching = searchQuery.trim().length > 0 || selectedTags.length > 0;

  const resolveFolderHandle = useCallback(async (path: string): Promise<any | null> => {
    if (!path) return vaultHandle;
    if (isDriveVault) {
      const entry = drivePathIndex?.getEntry(path);
      if (!entry) return null;
      return new DriveDirectoryHandle(entry.name, entry.id);
    }
    if (!vaultHandle) return null;
    let dir: any = vaultHandle;
    for (const segment of path.split("/")) {
      try {
        dir = await dir.getDirectoryHandle(segment);
      } catch {
        return null;
      }
    }
    return dir;
  }, [vaultHandle, isDriveVault, drivePathIndex]);

  useBackButtonClose(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[1000] flex flex-col bg-surface animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-edge-subtle shrink-0">
          <span className="text-ui-subhead font-medium text-fg">Files</span>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 text-fg-muted">
            <HiOutlineX size={20} />
          </button>
        </div>
        {!vaultHandle ? (
          <div className="flex-1 overflow-y-auto p-3">
            <VaultSidebarEmpty
              isVaultSupported={isVaultSupported}
              openVault={openVault}
              onCreateVault={() => setNewVaultFlowOpen(true)}
              onConnectDrive={openDriveVaultPicker}
              onImport={onImport}
              onExport={onExport}
              setActiveFilePath={setActiveFilePath}
              activeFilePath={activeFilePath}
              onClose={onClose}
            />
          </div>
        ) : (
        <>
        <div className="px-4 py-2 border-b border-edge-subtle shrink-0">
          <UnifiedSearchInput
            tokens={selectedTags}
            text={searchQuery}
            allTags={tags}
            onTokenAdd={(tag) => setSelectedTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]))}
            onTokenRemove={(tag) => setSelectedTags((prev) => prev.filter((t) => t !== tag))}
            onTextChange={setSearchQuery}
          />
        </div>
        {!isSearching && (
          <div className="flex border-b border-edge-subtle shrink-0">
            {(["files", "views"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-ui-footnote text-center capitalize transition-colors ${
                  activeTab === tab
                    ? "text-accent font-medium border-b-2 border-accent"
                    : "text-fg-faint hover:text-fg-muted"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {isSearching ? (
            <div className="flex flex-col h-full">
              <VaultSidebarFiles
                processedFiles={processedFiles}
                activeFilePath={activeFilePath}
                openFile={openFile}
                renameFile={renameFile}
                deleteFile={deleteFile}
                duplicateFile={duplicateFile}
                onClose={onClose}
                isSearchActive={isSearching}
                highlightQuery={searchQuery}
              />
              {hasMoreResults && (
                <button
                  type="button"
                  onClick={() => setShowAllResults(true)}
                  className="shrink-0 w-full py-2 text-ui-footnote text-center text-fg-faint hover:text-fg-muted transition-colors"
                >
                  Show all {totalResultsCount} results
                </button>
              )}
            </div>
          ) : activeTab === "views" ? (
            <SmartFolders
              onFileSelect={(handle, path) => {
                openFile(handle, path);
                onClose();
              }}
              renameFile={renameFile}
              deleteFile={deleteFile}
              duplicateFile={duplicateFile}
              onMatchCountChange={() => {}}
            />
          ) : (
            <VaultSidebarFiles
              processedFiles={allFiles}
              activeFilePath={activeFilePath}
              openFile={openFile}
              renameFile={renameFile}
              deleteFile={deleteFile}
              duplicateFile={duplicateFile}
              onClose={onClose}
              isSearchActive={false}
              highlightQuery=""
              treeView
              resolveFolderHandle={resolveFolderHandle}
              createNewFile={createNewFile}
              moveItem={moveItem}
            />
          )}
        </div>
        </>
        )}
      </div>
    </Portal>
  );
}
