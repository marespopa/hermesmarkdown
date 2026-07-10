"use client";

import React, { useState, useCallback } from "react";
import toast from "react-hot-toast";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useDialog } from "@/app/hooks/use-dialog";
import {
  HiOutlineChevronLeft,
  HiOutlineCloud,
  HiOutlineDocumentAdd,
  HiOutlineFolder,
  HiOutlineSearch,
  HiOutlineTag,
  HiOutlineCollection,
  HiOutlineClipboardList,
} from "react-icons/hi";
import Button from "@/app/components/Button";
import {
  atom_activeFilePath,
  atom_sidebarWidth,
  atom_isCloudVault,
} from "@/app/atoms/atoms";
import { atom_railPanel, atom_newVaultFlowOpen, atom_pendingScrollTarget, atom_showHiddenFiles, RailPanel } from "@/app/atoms/ui-atoms";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import SmartFolders from "./SmartFolders";
import VaultSidebarTasks from "./VaultSidebarTasks";
import VaultSidebarTags from "./VaultSidebarTags";
import { useSidebarSearch } from "../hooks/useSidebarSearch";
import VaultSidebarEmpty from "./VaultSidebarEmpty";
import VaultSidebarFiles from "./VaultSidebarFiles";
import VaultSidebarFooter from "./VaultSidebarFooter";
import UnifiedSearchInput from "./UnifiedSearchInput";

const SIDEBAR_PANELS: { id: RailPanel; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "files", label: "Files", Icon: HiOutlineFolder },
  { id: "search", label: "Search", Icon: HiOutlineSearch },
  { id: "tags", label: "Tags", Icon: HiOutlineTag },
  { id: "views", label: "Views", Icon: HiOutlineCollection },
  { id: "tasks", label: "Tasks", Icon: HiOutlineClipboardList },
];

interface VaultSidebarProps {
  panel: RailPanel;
  onClose?: () => void;
  onNewFile?: () => void;
  onNewAIFile?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  onRefresh?: () => Promise<void>;
  onHome?: () => void;
  onOpenDocumentation?: () => void;
}

export default function VaultSidebar({
  panel,
  onClose,
  onNewFile,
  onNewAIFile,
  onImport,
  onExport,
  onRefresh,
  onHome,
  onOpenDocumentation,
}: VaultSidebarProps) {
  const {
    openFile,
    vaultHandle,
    deleteFile,
    renameFile,
    duplicateFile,
    moveItem,
    createNewFile,
    closeVault,
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
  const [sidebarWidth, setSidebarWidth] = useAtom(atom_sidebarWidth);
  const isCloudVault = useAtomValue(atom_isCloudVault);
  const setRailPanel = useSetAtom(atom_railPanel);
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

          {onClose && (
            <Button
              variant="icon"
              className="w-10 h-10 shrink-0 opacity-80 hover:opacity-100"
              onClick={onClose}
              title="Collapse Sidebar"
              aria-label="Collapse Sidebar"
            >
              <HiOutlineChevronLeft size={18} />
            </Button>
          )}
        </div>

        {vaultHandle && (
          <div className="-mx-3 px-2 flex items-stretch gap-0.5 border-t border-edge-subtle">
            {SIDEBAR_PANELS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setRailPanel(id)}
                title={label}
                aria-label={label}
                aria-pressed={panel === id}
                className={`flex-1 flex items-center justify-center py-2 transition-colors ${
                  panel === id
                    ? "text-sage"
                    : "text-ink-muted hover:text-ink-light dark:text-stone dark:hover:text-ink-dark"
                }`}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        )}

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

      <VaultSidebarFooter
        vaultHandle={vaultHandle}
        closeVault={closeVault}
        openVault={openVault}
        isVaultSupported={isVaultSupported}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        showHiddenFiles={showHiddenFiles}
        onToggleHiddenFiles={handleToggleHiddenFiles}
        onHome={onHome}
        onOpenDocumentation={onOpenDocumentation}
      />
      </div>
  );
}
