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
  atom_activeFilePath,
  atom_moveTab,
  atom_saveStatus,
  atom_vaultHandle,
  atom_workspaceLayout,
} from "@/app/atoms/atoms";
import { atom_newVaultFlowOpen, atom_isVoicePreviewVisible } from "@/app/atoms/ui-atoms";
import { HiOutlineDocumentText, HiOutlineEye, HiOutlineChartBar, HiOutlineX, HiOutlineClipboardCopy, HiOutlineSave, HiOutlineDotsHorizontal, HiOutlinePlus, HiOutlineFolderOpen, HiOutlineDatabase, HiOutlineCollection, HiOutlineChevronDown, HiOutlineChevronUp } from "react-icons/hi";
import { VscSplitHorizontal } from "react-icons/vsc";
import PaneTab, { TabSaveState } from "./PaneTab";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useAtomValue } from "jotai";
import Button from "../../components/Button";
import Tooltip from "@/app/components/Tooltip";
import { formatShortcut } from "@/app/utils/platform";
import { useCommandPalette } from "@/app/components/CommandPalette/CommandPaletteContext";
import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";
import { usePaneFileActions } from "../hooks/use-pane-file-actions";
import { useChromeVisibility } from "@/app/hooks/use-chrome-visibility";

interface PaneLeafProps {
  leaf: PanelLeaf;
}

export default function PaneLeaf({ leaf }: PaneLeafProps) {
  const [activePaneId, setActivePaneId] = useAtom(atom_activePaneId);
  const [openFiles] = useAtom(atom_openFiles);
  const [, splitPane] = useAtom(atom_splitPane);
  const [, closePane] = useAtom(atom_closePane);
  const [, setActiveFilePath] = useAtom(atom_activeFilePath);
  const [, moveTab] = useAtom(atom_moveTab);
  const saveStatus = useAtomValue(atom_saveStatus);
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const workspaceLayout = useAtomValue(atom_workspaceLayout);
  const [, setNewVaultFlowOpen] = useAtom(atom_newVaultFlowOpen);
  const isOnlyPane = "type" in workspaceLayout.rootContainer;
  const isMobileChrome = useIsMobileChrome();

  const { openFileByName, createNewFile, importFile, openVault, isVaultSupported } = useFileSystem();
  const filePath = leaf.activeFilePath || "draft";
  const [content, setContent] = useAtom(atom_fileContent(filePath));

  const isActive = activePaneId === leaf.id;
  const isVoicePreviewVisible = useAtomValue(atom_isVoicePreviewVisible);
  const isDimmed = isVoicePreviewVisible && !isActive;
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { open: openCommandPalette } = useCommandPalette();

  const handleEmptyNewFile = () => {
    if (vaultHandle) {
      void createNewFile();
    } else {
      setActiveFilePath("draft");
    }
  };

  const handleEmptyOpenFile = async () => {
    // With a vault open, "Open File" should pick from the vault, not the
    // local disk — the command palette already does fuzzy vault file search.
    if (vaultHandle) {
      openCommandPalette();
      return;
    }
    const result = await importFile();
    if (result === null) {
      fileInputRef.current?.click();
    }
  };

  const handleEmptyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setContent(text);
      setActiveFilePath("draft");
    };
    reader.readAsText(file);
  };

  const { handleSave, handleCopy, closeTabWithAutosave, buildTabMenuItems } = usePaneFileActions(leaf);

  const getIcon = (type: string) => {
    switch (type) {
      case "editor": return <HiOutlineDocumentText size={14} />;
      case "preview": return <HiOutlineEye size={14} />;
      case "metrics": return <HiOutlineChartBar size={14} />;
      default: return <HiOutlineDocumentText size={14} />;
    }
  };

  const [draggedOverIndex, setDraggedOverIndex] = React.useState<number | null>(null);
  const [tabMenu, setTabMenu] = React.useState<{ x: number; y: number; path: string; includeActions?: boolean } | null>(null);

  // Progressive collapse: as the pane narrows (e.g. after a split), fold
  // lower-priority actions into the "Tab options" menu instead of letting
  // them get clipped by the row's overflow-hidden. Save and Close Pane stay
  // put — they're the ones people reach for even in a squeezed pane.
  const tabBarRowRef = React.useRef<HTMLDivElement>(null);
  const [tabBarRowWidth, setTabBarRowWidth] = React.useState(Infinity);
  React.useEffect(() => {
    const el = tabBarRowRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setTabBarRowWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const hideCopyMarkdown = tabBarRowWidth < 440;
  const hideSplitRight = tabBarRowWidth < 360;
  // Chrome-at-rest: the tab bar fades out while idly focused in the editor,
  // reveals on top-edge hover, and stays put while its own context menu is open.
  const { visible: tabBarVisible, reveal: revealTabBar, hide: hideTabBar } = useChromeVisibility({ forceVisible: tabMenu !== null });

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
      className={`h-full flex flex-col transition-all duration-300 overflow-hidden bg-paper-pale dark:bg-paper-dark ${
        isActive ? "z-10" : ""
      } ${isDimmed ? "opacity-40 saturate-50" : ""}`}
      onClick={() => setActivePaneId(leaf.id)}
    >
      {/* Pane Tabs Bar — desktop only. On mobile there are no split panes
          and no visible tab strip (MobileControlRail/MobileFileIndicator
          handle switching and file actions instead), so this whole bar
          would be dead weight. Chrome-at-rest: fades out while idly
          focused in the editor, reveals on top-edge hover. */}
      {!isMobileChrome && (
      <div className="shrink-0 relative">
        {/* Always-present, invisible top-edge strip so the mouse has
            somewhere to land and bring the bar back once its height has
            collapsed to 0. */}
        <div className="absolute left-0 top-0 w-full h-2 z-30" onMouseEnter={revealTabBar} />
        <button
          type="button"
          onClick={() => (tabBarVisible ? hideTabBar() : revealTabBar())}
          aria-label={tabBarVisible ? "Hide tabs" : "Show tabs"}
          title={tabBarVisible ? "Hide tabs" : "Show tabs"}
          className="absolute left-1/2 top-0 -translate-x-1/2 z-30 w-10 h-2.5 rounded-b-lg bg-chrome border border-t-0 border-edge-subtle flex items-center justify-center text-fg-faint opacity-50 hover:opacity-100 hover:text-fg transition-opacity"
        >
          {tabBarVisible ? <HiOutlineChevronUp size={10} /> : <HiOutlineChevronDown size={10} />}
        </button>
        <div
          className={`shrink-0 overflow-hidden transition-[max-height,opacity] duration-200 ease-in-out ${
            tabBarVisible ? "max-h-9 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
          }`}
          onMouseEnter={revealTabBar}
        >
      <div
        ref={tabBarRowRef}
        className="flex items-center bg-chrome border-b border-edge-subtle h-9 shrink-0 relative z-20"
      >
        {/* Scrollable tabs strip */}
          <div
            className="flex items-center flex-1 overflow-x-auto overflow-y-hidden scrollbar-none h-full px-2 min-w-0"
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
          
          </div>{/* end scrollable tabs strip */}

          {/* Fixed actions — always visible, never scrolled */}
          <div className="flex items-center gap-0.5 pl-2 pr-1 shrink-0 h-full z-20">
            {isActive && leaf.openFilePaths.length > 0 && (
              <>
                {!hideCopyMarkdown && (
                  <Tooltip label="Copy Markdown">
                    <Button
                      variant="icon"
                      onClick={handleCopy}
                      aria-label="Copy Markdown"
                      className="w-9 h-9 flex items-center justify-center text-ink-muted hover:text-sage transition-all rounded-xl"
                    >
                      <HiOutlineClipboardCopy size={18} />
                    </Button>
                  </Tooltip>
                )}
                <Tooltip label="Save" shortcut={formatShortcut("S")}>
                  <Button
                    variant="icon"
                    onClick={handleSave}
                    aria-label="Save"
                    className="w-9 h-9 flex items-center justify-center text-ink-muted hover:text-sage transition-all rounded-xl"
                  >
                    <HiOutlineSave size={18} />
                  </Button>
                </Tooltip>
                <div className="w-px h-3 bg-beige dark:bg-clay mx-1 opacity-50" />
                <Tooltip label="Tab options">
                  <Button
                    variant="icon"
                    onClick={(e) => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setTabMenu({ x: rect.left, y: rect.bottom + 4, path: leaf.activeFilePath || "draft", includeActions: true });
                    }}
                    aria-label="Tab options"
                    className="w-9 h-9 flex items-center justify-center text-ink-muted hover:text-ink-light dark:hover:text-ink-dark transition-all rounded-xl"
                  >
                    <HiOutlineDotsHorizontal size={16} />
                  </Button>
                </Tooltip>
              </>
            )}
            {!hideSplitRight && (
              <Tooltip label="Split Right">
                <Button
                  variant="icon"
                  onClick={() => splitPane({ id: leaf.id, direction: "horizontal" })}
                  aria-label="Split Right"
                  className="w-9 h-9 flex items-center justify-center text-ink-muted hover:text-ink-light dark:hover:text-ink-dark transition-all rounded-xl"
                >
                  <VscSplitHorizontal size={16} />
                </Button>
              </Tooltip>
            )}
            {!isOnlyPane && (
              <Tooltip label="Close Pane">
                <Button
                  variant="icon"
                  onClick={() => closePane(leaf.id)}
                  aria-label="Close Pane"
                  className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-red-500 transition-all rounded-xl"
                >
                  <HiOutlineX size={18} />
                </Button>
              </Tooltip>
            )}
          </div>
      </div>
        </div>
      </div>
      )}

      {/* Pane Content */}
      <div className="flex-1 overscroll-none overflow-auto">
        {leaf.openFilePaths.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div className="flex flex-col items-center space-y-3 opacity-30">
              <HiOutlineDocumentText size={40} />
              <span className="text-ui-caption font-medium">No file open</span>
            </div>
            <div className="flex flex-col items-stretch w-full max-w-xs px-4 space-y-1">
              <button
                onClick={handleEmptyNewFile}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-ui-footnote text-ink-muted hover:text-ink-light dark:hover:text-ink-dark hover:bg-paper-softgray dark:hover:bg-paper-dark-surface/40 transition-colors"
              >
                <HiOutlinePlus size={16} className="shrink-0" />
                <span className="truncate">New File</span>
              </button>
              <button
                onClick={handleEmptyOpenFile}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-ui-footnote text-ink-muted hover:text-ink-light dark:hover:text-ink-dark hover:bg-paper-softgray dark:hover:bg-paper-dark-surface/40 transition-colors"
              >
                <HiOutlineFolderOpen size={16} className="shrink-0" />
                <span className="truncate">Open File</span>
              </button>
              {!vaultHandle && isVaultSupported && (
                <button
                  onClick={() => openVault()}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-ui-footnote text-ink-muted hover:text-ink-light dark:hover:text-ink-dark hover:bg-paper-softgray dark:hover:bg-paper-dark-surface/40 transition-colors"
                >
                  <HiOutlineDatabase size={16} className="shrink-0" />
                  <span className="truncate">Open Vault</span>
                </button>
              )}
              {isVaultSupported && (
                <button
                  onClick={() => setNewVaultFlowOpen(true)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-ui-footnote text-ink-muted hover:text-ink-light dark:hover:text-ink-dark hover:bg-paper-softgray dark:hover:bg-paper-dark-surface/40 transition-colors"
                >
                  <HiOutlineCollection size={16} className="shrink-0" />
                  <span className="truncate">Create Vault</span>
                </button>
              )}
              <button
                onClick={openCommandPalette}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-ui-footnote text-ink-muted hover:text-ink-light dark:hover:text-ink-dark hover:bg-paper-softgray dark:hover:bg-paper-dark-surface/40 transition-colors"
              >
                <HiOutlineDotsHorizontal size={16} className="shrink-0" />
                <span className="truncate min-w-0 flex-1 text-left">Command Palette</span>
                <span className="text-ui-caption opacity-50 shrink-0 whitespace-nowrap">{formatShortcut("P", { shift: true })}</span>
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleEmptyFileChange}
              accept=".md,.txt,.markdown"
              className="hidden"
            />
          </div>
        ) : leaf.type === "editor" ? (
          <MarkdownEditor
            key={leaf.activeFilePath || "draft"}
            value={content}
            onChange={setContent}
            filePath={leaf.activeFilePath || "draft"}
            onWikiLinkClick={openFileByName}
            placeholder={`Editing ${leaf.activeFilePath || "Draft"}...`}
            isActivePane={isActive}
            isSplit={!isOnlyPane}
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
          items={(() => {
            const collapsedActions: TabContextMenuItem[] = [];
            if (tabMenu.includeActions && hideCopyMarkdown) collapsedActions.push({ label: "Copy Markdown", onClick: handleCopy });
            if (tabMenu.includeActions && hideSplitRight) collapsedActions.push({ label: "Split Right", onClick: () => splitPane({ id: leaf.id, direction: "horizontal" }) });
            const closeItems = buildTabMenuItems(tabMenu.path);
            if (collapsedActions.length > 0) closeItems[0] = { ...closeItems[0], divider: true };
            return [...collapsedActions, ...closeItems];
          })()}
          onClose={() => setTabMenu(null)}
        />
      )}
    </div>
  );
}
