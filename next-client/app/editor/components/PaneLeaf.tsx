"use client";

import React from "react";
import { PanelLeaf } from "@/app/types/workspace";
import MarkdownEditor from "./MarkdownEditor";
import TabContextMenu, { TabContextMenuItem } from "./TabContextMenu";
import { useAtom } from "jotai";
import { 
  atom_activePaneId, 
  atom_fileContent, 
  atom_openFiles, 
  atom_splitPane, 
  atom_closePane, 
  atom_closeTab, 
  atom_activeFilePath, 
  atom_moveTab, 
  atom_isZenModeActive,
  atom_saveStatus,
  atom_liveHandles,
  atom_autosaveMode,
  atom_vaultHandle,
  atom_workspaceLayout,
  contentStore
} from "@/app/atoms/atoms";
import { HiOutlineDocumentText, HiOutlineEye, HiOutlineChartBar, HiOutlineX, HiOutlineClipboardCopy, HiOutlineSave, HiOutlineDotsHorizontal } from "react-icons/hi";
import { VscSplitHorizontal } from "react-icons/vsc";
import { showCopyToast, showErrorToast } from "@/app/components/Toastr";
import PaneTab, { TabSaveState } from "./PaneTab";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useAtomValue } from "jotai";
import { useDialog } from "@/app/hooks/use-dialog";
import Button from "../../components/Button";

interface PaneLeafProps {
  leaf: PanelLeaf;
}

export default function PaneLeaf({ leaf }: PaneLeafProps) {
  const [activePaneId, setActivePaneId] = useAtom(atom_activePaneId);
  const [openFiles] = useAtom(atom_openFiles);
  const [, splitPane] = useAtom(atom_splitPane);
  const [, closePane] = useAtom(atom_closePane);
  const [, closeTab] = useAtom(atom_closeTab);
  const [, setActiveFilePath] = useAtom(atom_activeFilePath);
  const [, moveTab] = useAtom(atom_moveTab);
  const [isZenModeActive] = useAtom(atom_isZenModeActive);
  const saveStatus = useAtomValue(atom_saveStatus);
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const workspaceLayout = useAtomValue(atom_workspaceLayout);
  const isOnlyPane = "type" in workspaceLayout.rootContainer;

  const { openFileByName, saveFile, exportFile, createFile } = useFileSystem();
  const dialog = useDialog();
  const filePath = leaf.activeFilePath || "draft";
  const [content, setContent] = useAtom(atom_fileContent(filePath));
  const liveHandle = useAtomValue(atom_liveHandles(filePath));

  const isActive = activePaneId === leaf.id;

  const handleExport = async () => {
    if (!content.trim()) return;
    const fileState = openFiles[filePath];
    const fileName = fileState?.fileName || "Untitled";

    if (liveHandle) {
      const success = await saveFile(content, liveHandle, 0, false, filePath);
      if (success) return;
    }
    await exportFile(content, fileName);
  };

  const handleSave = async () => {
    if (!content.trim()) return;

    // Save in place if we already have a live handle.
    if (liveHandle) {
      await saveFile(content, liveHandle, 0, false, filePath);
      return;
    }

    // Real file that lost its handle (e.g. after reload, before vault rebind).
    // Walk the vault to recover the handle before falling back to "save as".
    if (filePath !== "draft" && vaultHandle) {
      try {
        const parts = filePath.split("/");
        let current: FileSystemDirectoryHandle = vaultHandle;
        for (let i = 0; i < parts.length - 1; i++) {
          current = await current.getDirectoryHandle(parts[i]);
        }
        const recovered = await current.getFileHandle(parts[parts.length - 1]);
        await saveFile(content, recovered, 0, false, filePath);
        return;
      } catch {
        // Couldn't recover — fall through to the draft/save-as path below.
      }
    }

    // Draft saved to the vault for the first time → prompt for a name and create.
    if (vaultHandle) {
      const fileState = openFiles[filePath];
      const fileName = fileState?.fileName || "untitled";
      const name = await dialog.prompt("Enter file name:", fileName.replace(".md", ""), "Save to Vault");
      if (name) {
        await createFile(name, content);
      }
      return;
    }

    // No vault → download.
    await handleExport();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "editor": return <HiOutlineDocumentText size={14} />;
      case "preview": return <HiOutlineEye size={14} />;
      case "metrics": return <HiOutlineChartBar size={14} />;
      default: return <HiOutlineDocumentText size={14} />;
    }
  };

  const [draggedOverIndex, setDraggedOverIndex] = React.useState<number | null>(null);
  const [tabMenu, setTabMenu] = React.useState<{ x: number; y: number; path: string } | null>(null);

  const closeTabWithAutosave = React.useCallback(async (path: string) => {
    const autosaveMode = contentStore.get(atom_autosaveMode);
    if (autosaveMode !== "manual") {
      const fileState = contentStore.get(atom_openFiles)[path];
      const tabHandle = contentStore.get(atom_liveHandles(path));
      if (fileState && fileState.content !== fileState.lastSavedContent && tabHandle) {
        // Fire and forget so we don't block tab closing if the file system is locked (e.g. Google Drive 45s retries)
        void saveFile(fileState.content, tabHandle, 0, true, path);
      }
    }
    closeTab({ paneId: leaf.id, filePath: path });
  }, [closeTab, leaf.id, saveFile]);

  const buildTabMenuItems = (targetPath: string): TabContextMenuItem[] => {
    const others = leaf.openFilePaths.filter((p) => p !== targetPath);
    return [
      { label: "Close", onClick: () => { void closeTabWithAutosave(targetPath); } },
      { label: "Close Others", disabled: others.length === 0, onClick: () => { for (const p of others) void closeTabWithAutosave(p); } },
      { label: "Close All", onClick: () => { for (const p of [...leaf.openFilePaths]) void closeTabWithAutosave(p); } },
    ];
  };

  const handleDragStart = (e: React.DragEvent, path: string) => {
    const data = JSON.stringify({ 
      sourcePaneId: leaf.id, 
      filePath: path 
    });
    // Set custom type and fallback text/plain for better compatibility
    e.dataTransfer.setData("application/hermes-tab", data);
    e.dataTransfer.setData("text/plain", data);
    e.dataTransfer.effectAllowed = "move";
    
    // Explicitly set the drag image to the current tab element
    const target = e.currentTarget as HTMLElement;
    if (e.dataTransfer.setDragImage) {
      // Offset by roughly half the tab height and a small X offset
      e.dataTransfer.setDragImage(target, 20, 18);
    }
    
    // Set a class on the dragged element
    target.classList.add("opacity-20");
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove("opacity-20");
    setDraggedOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index?: number) => {
    // Check for our custom type or check if it looks like our JSON in text/plain
    const types = e.dataTransfer.types;
    const isHermesTab = types.includes("application/hermes-tab") || types.includes("text/plain");
    
    if (isHermesTab) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (index !== undefined) {
        setDraggedOverIndex(index);
      }
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      showCopyToast("Markdown copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy:", err);
      showErrorToast("Failed to copy markdown");
    }
  };

  const handleDragLeave = () => {
    setDraggedOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOverIndex(null);

    let data = e.dataTransfer.getData("application/hermes-tab");
    if (!data) {
      data = e.dataTransfer.getData("text/plain");
    }
    
    if (!data) return;

    try {
      const parsed = JSON.parse(data);
      if (!parsed.sourcePaneId || !parsed.filePath) return;
      
      moveTab({ 
        sourcePaneId: parsed.sourcePaneId, 
        targetPaneId: leaf.id, 
        filePath: parsed.filePath, 
        targetIndex 
      });
    } catch {
      // Not our data
    }
  };

  return (
    <div 
      className={`h-full flex flex-col transition-all duration-300 overflow-hidden ${
        isActive && !isZenModeActive
          ? "bg-surface z-10"
          : "bg-surface"
      }`}
      onClick={() => setActivePaneId(leaf.id)}
    >
      {/* Pane Tabs Bar - Premium macOS Style */}
      {!isZenModeActive && (
        <div 
          className="flex items-center paper-grain bg-chrome border-b border-edge-subtle h-12 md:h-9 shrink-0 overflow-x-auto overflow-y-hidden scrollbar-none px-2 relative z-20"
          onDragOver={(e) => handleDragOver(e)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, leaf.openFilePaths.length)}
        >
          {leaf.openFilePaths.map((path, index) => {
            const isTabActive = leaf.activeFilePath === path;
            const isDraggedOver = draggedOverIndex === index;
            const fileState = openFiles[path];
            const fileName = fileState?.fileName || path.split("/").pop() || "Untitled";
            const isDirty = fileState && fileState.content !== fileState.lastSavedContent;

            const isThisTabSaving = saveStatus.path === path && saveStatus.state === "saving";
            const isThisTabSaved = saveStatus.path === path && saveStatus.state === "saved";
            const isThisTabError = saveStatus.path === path && saveStatus.state === "error";

            const tabSaveState: TabSaveState = isThisTabError
              ? "error"
              : isThisTabSaving
              ? "saving"
              : isThisTabSaved
              ? "saved"
              : isDirty
              ? "dirty"
              : "idle";

            return (
              <PaneTab
                key={path}
                fileName={fileName}
                isActive={isTabActive}
                saveState={tabSaveState}
                saveErrorMessage={saveStatus.message}
                isDraggedOver={isDraggedOver}
                draggable
                onDragStart={(e) => handleDragStart(e, path)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePaneId(leaf.id);
                  setActiveFilePath(path);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActivePaneId(leaf.id);
                  setTabMenu({ x: e.clientX, y: e.clientY, path });
                }}
                onClose={(e) => {
                  e.stopPropagation();
                  void closeTabWithAutosave(path);
                }}
              />
            );
          })}
          
          {/* Pane Actions - Minimalist */}
          <div className="flex items-center gap-0.5 ml-auto pl-4 pr-1 sticky right-0 bg-gradient-to-l from-chrome via-chrome/80 to-transparent h-full shrink-0 z-20">
            {isActive && leaf.openFilePaths.length > 0 && (
              <>
                <Button
                  variant="icon"
                  onClick={handleCopy}
                  title="Copy Markdown"
                  aria-label="Copy Markdown"
                  className="w-9 h-9 flex items-center justify-center text-ink-muted hover:text-sage transition-all rounded-xl"
                >
                  <HiOutlineClipboardCopy size={18} />
                </Button>
                <Button
                  variant="icon"
                  onClick={handleSave}
                  title="Save"
                  aria-label="Save"
                  className="w-9 h-9 flex items-center justify-center text-ink-muted hover:text-sage transition-all rounded-xl"
                >
                  <HiOutlineSave size={18} />
                </Button>
                <div className="w-px h-3 bg-beige dark:bg-clay mx-1 opacity-50" />
                <Button
                  variant="icon"
                  onClick={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setTabMenu({ x: rect.left, y: rect.bottom + 4, path: leaf.activeFilePath || "draft" });
                  }}
                  title="Tab options"
                  aria-label="Tab options"
                  className="w-9 h-9 flex items-center justify-center text-ink-muted hover:text-ink-light dark:hover:text-ink-dark transition-all rounded-xl"
                >
                  <HiOutlineDotsHorizontal size={16} />
                </Button>
              </>
            )}
            <Button
              variant="icon"
              onClick={() => splitPane({ id: leaf.id, direction: "horizontal" })}
              title="Split Right"
              aria-label="Split Right"
              className="w-9 h-9 flex items-center justify-center text-ink-muted hover:text-ink-light dark:hover:text-ink-dark transition-all hidden sm:flex rounded-xl"
            >
              <VscSplitHorizontal size={16} />
            </Button>
            {!isOnlyPane && (
              <Button
                variant="icon"
                onClick={() => closePane(leaf.id)}
                title="Close Pane"
                aria-label="Close Pane"
                className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-red-500 transition-all rounded-xl"
              >
                <HiOutlineX size={18} />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Pane Content */}
      <div className={`flex-1 overscroll-none ${isZenModeActive ? "overflow-hidden" : "overflow-auto"}`}>
        {leaf.openFilePaths.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-10 space-y-4">
             <HiOutlineDocumentText size={48} />
             <span className="text-ui-caption font-medium">No file open</span>
          </div>
        ) : leaf.type === "editor" ? (
          <MarkdownEditor
            key={leaf.activeFilePath || "draft"}
            value={content}
            onChange={setContent}
            filePath={leaf.activeFilePath || "draft"}
            onWikiLinkClick={openFileByName}
            placeholder={`Editing ${leaf.activeFilePath || "Draft"}...`}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full opacity-20 space-y-2">
            {getIcon(leaf.type)}
            <span className="text-ui-caption font-medium">{leaf.type} view</span>
          </div>
        )}
      </div>


      {tabMenu && (
        <TabContextMenu
          x={tabMenu.x}
          y={tabMenu.y}
          items={buildTabMenuItems(tabMenu.path)}
          onClose={() => setTabMenu(null)}
        />
      )}
    </div>
  );
}
