"use client";

import { useCallback } from "react";
import { HiOutlineCog, HiOutlineDocumentAdd, HiOutlineFolderAdd, HiOutlineFolderOpen } from "react-icons/hi";
import { useFileSystem } from "@/app/hooks/use-file-system";
import Button from "@/app/components/Button";
import {
  atom_activeFilePath,
  atom_activePaneId,
  atom_isCloudVault,
  atom_splitPane,
  atom_vaultDescriptor,
} from "@/app/atoms/atoms";
import { atom_githubVaultDialogOpen, atom_newVaultFlowOpen, atom_recentFilePaths, RailPanel } from "@/app/atoms/ui-atoms";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import toast from "react-hot-toast";
import { useSidebarSearch } from "../hooks/useSidebarSearch";
import VaultSidebarEmpty from "./VaultSidebarEmpty";
import VaultSidebarFiles from "./VaultSidebarFiles";
import VaultSidebarHeader from "./VaultSidebarHeader";
import VaultSidebarNavigator from "./VaultSidebarNavigator";
import { useSidebarResize } from "../hooks/useSidebarResize";

// The rail (SidebarRail.tsx) is always visible at a fixed width, so this
// panel's own floor is just whatever its content needs — the search input
// with tag tokens and file-tree rows with hover actions are the narrowest
// things it has to fit, not a footer icon row (that lives in the rail now).
interface VaultSidebarProps {
  panel: RailPanel;
  onClose?: () => void;
  onNewFile?: () => void;
  onSettings?: () => void;
  onImport?: () => void;
  onExport?: () => void;
}

export default function VaultSidebar({
  onClose,
  onNewFile,
  onSettings,
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
    createFolder,
    isMounted,
    openVault,
    isVaultSupported,
  } = useFileSystem();

  const setNewVaultFlowOpen = useSetAtom(atom_newVaultFlowOpen);
  const setGitHubVaultDialogOpen = useSetAtom(atom_githubVaultDialogOpen);
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
  const isCloudVault = useAtomValue(atom_isCloudVault);
  const vaultDescriptor = useAtomValue(atom_vaultDescriptor);
  const { sidebarWidth, isResizing, startResizing } = useSidebarResize();

  const { allFiles, folderPaths } = useSidebarSearch({ selectedTags: [], panel: "files" });
  const [recentFilePaths, setRecentFilePaths] = useAtom(atom_recentFilePaths);
  const filesByPath = new Map(allFiles.map((file) => [file.path, file]));
  const recentFiles = (Array.isArray(recentFilePaths) ? recentFilePaths : [])
    .flatMap((path) => {
      const file = filesByPath.get(path);
      return file ? [file] : [];
    })
    .slice(0, 3);

  const openFileAndRecord = useCallback((handle: FileSystemFileHandle, path?: string) => {
    void openFile(handle, path);
    if (path) {
      setRecentFilePaths((previous) => [
        path,
        ...previous.filter((existing) => existing !== path),
      ].slice(0, 3));
    }
  }, [openFile, setRecentFilePaths]);

  const openFileInPane = useCallback((handle: FileSystemFileHandle, path?: string) => {
    if (!path || !activePaneId) return;
    splitPane({ id: activePaneId, direction: "horizontal", filePath: path });
    openFile(handle, path);
    onClose?.();
  }, [activePaneId, onClose, openFile, splitPane]);

  const connectGitHubVault = useCallback(() => {
    setGitHubVaultDialogOpen(true);
  }, [setGitHubVaultDialogOpen]);

  const revealVault = useCallback(async () => {
    if (!vaultHandle || !("showDirectoryPicker" in window)) return;
    try {
      await window.showDirectoryPicker({ mode: "read", startIn: vaultHandle });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        toast.error("Could not open the vault folder.");
      }
    }
  }, [vaultHandle]);

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

      <VaultSidebarHeader
        vaultName={vaultDescriptor?.kind === "github" ? vaultDescriptor.displayName : vaultHandle?.name}
        isCloudVault={isCloudVault}
        hasVault={Boolean(vaultHandle)}
        onSwitchVault={isVaultSupported ? () => void openVault() : undefined}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {!vaultHandle ? (
          <div className="flex-1 overflow-y-auto overscroll-none p-3 custom-scrollbar">
            <VaultSidebarEmpty
              isVaultSupported={isVaultSupported}
              openVault={openVault}
              onCreateVault={() => setNewVaultFlowOpen(true)}
              onImport={onImport}
              onExport={onExport}
              onConnectGitHub={connectGitHubVault}
              setActiveFilePath={setActiveFilePath}
              activeFilePath={activeFilePath}
              onClose={onClose}
            />
          </div>
        ) : (
          <VaultSidebarNavigator
            recentFiles={recentFiles}
            onOpenRecent={(path) => {
              const file = filesByPath.get(path);
              if (file) openFileAndRecord(file.handle, file.path);
            }}
          >
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-hidden flex flex-col">
              <VaultSidebarFiles
                processedFiles={allFiles}
                activeFilePath={activeFilePath}
                openFile={openFileAndRecord}
                openFileInPane={openFileInPane}
                renameFile={renameFile}
                deleteFile={deleteFile}
                duplicateFile={duplicateFile}
                onClose={onClose}
                treeView
                folderPaths={folderPaths}
                resolveFolderHandle={resolveFolderHandle}
                createNewFile={createNewFile}
                createFolder={createFolder}
                moveItem={moveItem}
              />
            </div>
          </div>
            </VaultSidebarNavigator>
        )}
      </div>
      <footer className="flex h-8 shrink-0 items-center gap-2 border-t border-[#E5E5EA] bg-[#F2F2F7] px-3 text-ui-micro text-fg-muted dark:border-[#2C2C2E] dark:bg-[#1E1E20]">
        <span className="min-w-0 flex-1 truncate tabular-nums" aria-label="Vault metrics">
          {allFiles.length} {allFiles.length === 1 ? "note" : "notes"}, {folderPaths.length} {folderPaths.length === 1 ? "folder" : "folders"}
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          {vaultHandle && onNewFile && (
            <Button
              variant="bare"
              onClick={onNewFile}
              className="h-7 w-7 shrink-0 p-0 text-fg-muted hover:text-fg"
              aria-label="New note"
              title="New note"
            >
              <HiOutlineDocumentAdd size={15} />
            </Button>
          )}
          {vaultHandle && (
            <Button
              variant="bare"
              onClick={() => void createFolder()}
              className="h-7 w-7 shrink-0 p-0 text-fg-muted hover:text-fg"
              aria-label="New folder"
              title="New folder"
            >
              <HiOutlineFolderAdd size={15} />
            </Button>
          )}
          {vaultHandle && (
            <Button
              variant="bare"
              onClick={() => void revealVault()}
              className="h-7 w-7 shrink-0 p-0 text-fg-muted hover:text-fg"
              aria-label="Reveal vault in file picker"
              title="Reveal vault in file picker"
            >
              <HiOutlineFolderOpen size={15} />
            </Button>
          )}
          {onSettings && (
            <Button
              variant="bare"
              onClick={onSettings}
              className="h-7 w-7 shrink-0 p-0 text-fg-muted hover:text-fg"
              aria-label="Settings"
              title="Settings"
            >
              <HiOutlineCog size={15} />
            </Button>
          )}
        </div>
      </footer>
      </div>
  );
}
