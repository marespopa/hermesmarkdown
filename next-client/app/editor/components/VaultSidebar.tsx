"use client";

import React, { useState, useCallback } from "react";
import toast from "react-hot-toast";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useDialog } from "@/app/hooks/use-dialog";
import {
  HiOutlineCloud,
  HiOutlineDocumentAdd,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiChevronLeft,
} from "react-icons/hi";
import {
  atom_activeFilePath,
  atom_activePaneId,
  atom_sidebarWidth,
  atom_isCloudVault,
  atom_splitPane,
} from "@/app/atoms/atoms";
import { atom_railPanel, atom_newVaultFlowOpen, atom_pendingScrollTarget, atom_showHiddenFiles, atom_isSidebarResizing, RailPanel } from "@/app/atoms/ui-atoms";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import SmartFolders from "./SmartFolders";
import VaultSidebarTasks from "./VaultSidebarTasks";
import VaultSidebarTags from "./VaultSidebarTags";
import { useSidebarSearch } from "../hooks/useSidebarSearch";
import VaultSidebarEmpty from "./VaultSidebarEmpty";
import VaultSidebarFiles from "./VaultSidebarFiles";
import UnifiedSearchInput from "./UnifiedSearchInput";

// The rail (SidebarRail.tsx) is always visible at a fixed width, so this
// panel's own floor is just whatever its content needs — the search input
// with tag tokens and file-tree rows with hover actions are the narrowest
// things it has to fit, not a footer icon row (that lives in the rail now).
const MIN_SIDEBAR_WIDTH = 200;

interface VaultSidebarProps {
  panel: RailPanel;
  onClose?: () => void;
  onNewFile?: () => void;
  onNewAIFile?: () => void;
  onImport?: () => void;
  onExport?: () => void;
}

export default function VaultSidebar({
  panel,
  onClose,
  onNewFile,
  onNewAIFile,
  onImport,
  onExport,
}: VaultSidebarProps) {
  const {
    openFile,
    vaultHandle,
    deleteFile,
    renameFile,
    duplicateFile,
    moveItem,
    createNewFile,
    isMounted,
    openVault,
    isVaultSupported,
    scanVault,
    indexVaultTags,
  } = useFileSystem();

  const dialog = useDialog();
  const setNewVaultFlowOpen = useSetAtom(atom_newVaultFlowOpen);
  const setPendingScrollTarget = useSetAtom(atom_pendingScrollTarget);
  const [showHiddenFiles, setShowHiddenFiles] = useAtom(atom_showHiddenFiles);

  // Settings has the full description of what this reveals; here it's a quick
  // toggle so hiding system/skill files never requires leaving the sidebar.
  const handleToggleHiddenFiles = useCallback(() => {
    const next = !showHiddenFiles;
    setShowHiddenFiles(next);
    if (!vaultHandle) return;
    scanVault(vaultHandle as any, next);
    indexVaultTags?.(vaultHandle as any, next);
  }, [showHiddenFiles, setShowHiddenFiles, vaultHandle, scanVault, indexVaultTags]);

  // Resolves a directory handle for an arbitrary nested path (e.g. "a/b/c").
  // Tree nodes only carry path strings (built from the flat indexed file list),
  // so folder actions (rename/delete/new file/move) need this to get a real handle.
  const resolveFolderHandle = useCallback(async (path: string): Promise<any | null> => {
    if (!path) return vaultHandle;
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
  }, [vaultHandle]);

  const [activeFilePath, setActiveFilePath] = useAtom(atom_activeFilePath);
  const activePaneId = useAtomValue(atom_activePaneId);
  const [, splitPane] = useAtom(atom_splitPane);
  const [sidebarWidth, setSidebarWidth] = useAtom(atom_sidebarWidth);
  const isCloudVault = useAtomValue(atom_isCloudVault);
  const setRailPanel = useSetAtom(atom_railPanel);
  const [isResizing, setIsResizing] = useAtom(atom_isSidebarResizing);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const {
    searchQuery,
    setSearchQuery,
    processedFiles,
    totalResultsCount,
    hasMoreResults,
    setShowAllResults,
    allFiles,
    tags,
    tagCounts,
  } = useSidebarSearch({ selectedTags, panel });

  const isSearching = searchQuery.trim().length > 0 || selectedTags.length > 0;

  const openFileInPane = useCallback((handle: FileSystemFileHandle, path?: string) => {
    if (!path || !activePaneId) return;
    splitPane({ id: activePaneId, direction: "horizontal", filePath: path });
    openFile(handle, path);
    onClose?.();
  }, [activePaneId, onClose, openFile, splitPane]);

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
      const newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(600, e.clientX));
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

  // Persisted widths saved before MIN_SIDEBAR_WIDTH existed (or otherwise
  // corrupted) can be narrower than the content needs, clipping the search
  // input or file-tree row actions. Self-heal once on mount rather than
  // trusting the stored value forever.
  React.useEffect(() => {
    if (sidebarWidth < MIN_SIDEBAR_WIDTH) {
      setSidebarWidth(MIN_SIDEBAR_WIDTH);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isMounted) return null;

  return (
      <div
        className="flex flex-col h-full relative group/sidebar bg-chrome border-r border-edge-subtle"
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
        <div className="flex justify-between items-center gap-2 h-11 md:h-8">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-ui-body md:text-ui-subhead font-medium text-ink-light dark:text-ink-dark opacity-80 md:opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1.5 min-w-0">
              <span className="truncate">{vaultHandle?.name || "Notes"}</span>
              {isCloudVault && vaultHandle && (
                <span title="Cloud sync detected. HermesMarkdown will use enhanced error recovery if files are locked." className="shrink-0 text-sage/60 dark:text-sage/60 cursor-help">
                  <HiOutlineCloud size={14} />
                </span>
              )}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setRailPanel(null)}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
            className="shrink-0 flex items-center justify-center w-6 h-6 rounded text-ink-muted hover:text-ink-light dark:text-stone dark:hover:text-ink-dark hover:bg-paper-softgray dark:hover:bg-paper-dark-surface transition-colors"
          >
            <HiChevronLeft size={16} />
          </button>
        </div>

        {vaultHandle && panel === "files" && (
          <div className="-mx-3 px-1 flex items-stretch border-t border-b border-edge-subtle">
            <button
              type="button"
              onClick={onNewFile}
              title="New file"
              aria-label="New file"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-ink-muted hover:text-ink-light dark:text-stone dark:hover:text-ink-dark hover:bg-paper-softgray dark:hover:bg-paper-dark-surface transition-colors"
            >
              <HiOutlineDocumentAdd size={15} />
              <span className="text-ui-footnote leading-none">New file</span>
            </button>
            <button
              type="button"
              onClick={handleToggleHiddenFiles}
              title="Show hidden files"
              aria-label="Show hidden files"
              aria-pressed={showHiddenFiles}
              className="shrink-0 w-9 flex items-center justify-center text-ink-muted hover:text-ink-light dark:text-stone dark:hover:text-ink-dark hover:bg-paper-softgray dark:hover:bg-paper-dark-surface transition-colors"
            >
              {showHiddenFiles ? <HiOutlineEye size={15} /> : <HiOutlineEyeOff size={15} />}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {!vaultHandle ? (
          <div className="flex-1 overflow-y-auto overscroll-none p-3 custom-scrollbar">
            <VaultSidebarEmpty
              isVaultSupported={isVaultSupported}
              openVault={openVault}
              onCreateVault={() => setNewVaultFlowOpen(true)}
              onImport={onImport}
              onExport={onExport}
              setActiveFilePath={setActiveFilePath}
              activeFilePath={activeFilePath}
              onClose={onClose}
            />
          </div>
        ) : panel === "tags" ? (
          <VaultSidebarTags
            tags={tags}
            tagCounts={tagCounts}
            selectedTags={selectedTags}
            onSelectTag={(tag) => {
              setSelectedTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
              setRailPanel("search");
            }}
          />
        ) : panel === "views" ? (
          <div className="flex-1 overflow-y-auto">
            <SmartFolders
              onFileSelect={(handle, path) => {
                openFile(handle, path);
                if (onClose && window.innerWidth < 1024) onClose();
              }}
              renameFile={renameFile}
              deleteFile={deleteFile}
              duplicateFile={duplicateFile}
            />
          </div>
        ) : panel === "tasks" ? (
          <div className="flex-1 overflow-y-auto">
            <VaultSidebarTasks
              onFileSelect={(handle, path, line) => {
                openFile(handle, path);
                setPendingScrollTarget({ path, line });
                if (onClose && window.innerWidth < 1024) onClose();
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            {panel === "search" && (
              <div className="px-3 pt-3 pb-2 shrink-0">
                <UnifiedSearchInput
                  autoFocus
                  tokens={selectedTags}
                  text={searchQuery}
                  allTags={tags}
                  onTokenAdd={(tag) => setSelectedTags(prev => prev.includes(tag) ? prev : [...prev, tag])}
                  onTokenRemove={(tag) => setSelectedTags(prev => prev.filter(t => t !== tag))}
                  onTextChange={setSearchQuery}
                />
              </div>
            )}

            <div className="flex-1 overflow-hidden flex flex-col">
              <VaultSidebarFiles
                processedFiles={panel === "search" ? processedFiles : allFiles}
                activeFilePath={activeFilePath}
                openFile={openFile}
                openFileInPane={openFileInPane}
                renameFile={renameFile}
                deleteFile={deleteFile}
                duplicateFile={duplicateFile}
                onClose={onClose}
                isSearchActive={panel === "search" && isSearching}
                highlightQuery={panel === "search" ? searchQuery : ""}
                treeView={panel === "files"}
                resolveFolderHandle={resolveFolderHandle}
                createNewFile={createNewFile}
                moveItem={moveItem}
              />
              {panel === "search" && hasMoreResults && (
                <button
                  type="button"
                  onClick={() => setShowAllResults(true)}
                  className="shrink-0 w-full py-2 text-ui-footnote text-center text-fg-faint hover:text-fg-muted transition-colors"
                >
                  Show all {totalResultsCount} results
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
  );
}
