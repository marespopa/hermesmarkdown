"use client";

import React, { useState } from "react";
import Portal from "@/app/components/Portal/Portal";
import { useAtom, useAtomValue } from "jotai";
import { atom_activeFilePath } from "@/app/atoms/atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useSidebarSearch } from "../hooks/useSidebarSearch";
import SmartFolders from "./SmartFolders";
import VaultSidebarFiles from "./VaultSidebarFiles";
import UnifiedSearchInput from "./UnifiedSearchInput";
import { HiOutlineX } from "react-icons/hi";

export default function MobileFileOverlay({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { openFile, renameFile, deleteFile } = useFileSystem();
  const activeFilePath = useAtomValue(atom_activeFilePath);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { searchQuery, setSearchQuery, processedFiles, totalResultsCount, hasMoreResults, setShowAllResults, tags } =
    useSidebarSearch({ selectedTags, panel: "search" });
  const isSearching = searchQuery.trim().length > 0 || selectedTags.length > 0;

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
        <div className="flex-1 overflow-y-auto">
          {isSearching ? (
            <div className="flex flex-col h-full">
              <VaultSidebarFiles
                processedFiles={processedFiles}
                activeFilePath={activeFilePath}
                openFile={openFile}
                renameFile={renameFile}
                deleteFile={deleteFile}
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
          ) : (
            <SmartFolders
              onFileSelect={(handle, path) => {
                openFile(handle, path);
                onClose();
              }}
              renameFile={renameFile}
              deleteFile={deleteFile}
              onMatchCountChange={() => {}}
            />
          )}
        </div>
      </div>
    </Portal>
  );
}
