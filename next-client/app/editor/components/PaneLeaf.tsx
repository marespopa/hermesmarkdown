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
  getWorkspaceTabs,
} from "@/app/atoms/atoms";
import { atom_newVaultFlowOpen, atom_isVoicePreviewVisible } from "@/app/atoms/ui-atoms";
import { HiOutlineDocumentText, HiOutlineChartBar, HiOutlineX, HiOutlineClipboardCopy, HiOutlineSave, HiOutlineDotsHorizontal, HiOutlinePlus, HiOutlineFolderOpen, HiOutlineDatabase, HiOutlineCollection } from "react-icons/hi";
import { VscSplitHorizontal } from "react-icons/vsc";
import PaneTab, { TabSaveState, statusMeta } from "./PaneTab";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useAtomValue } from "jotai";
import Button from "../../components/Button";
import Tooltip from "@/app/components/Tooltip";
import { formatShortcut, isMacPlatform } from "@/app/utils/platform";
import { useCommandPalette } from "@/app/components/CommandPalette/CommandPaletteContext";
import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";
import { usePaneFileActions } from "../hooks/use-pane-file-actions";

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
  const newFileShortcut = isMacPlatform() ? "⌃⌥N" : "Ctrl+Alt+N";

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

  // Drives the tab bar's Save button — replaces the old floating,
  // draggable SaveStatusFab, which people found unintuitive to reposition.
  // Docked in the tab bar's own layout instead, so it can't overlap or
  // need dragging in the first place.
  const activeFileState = leaf.activeFilePath ? openFiles[leaf.activeFilePath] : undefined;
  const activeIsDirty = !!activeFileState && activeFileState.content !== activeFileState.lastSavedContent;
  const activeSaveState: TabSaveState =
    saveStatus.path === leaf.activeFilePath && saveStatus.state === "error"
      ? "error"
      : saveStatus.path === leaf.activeFilePath && saveStatus.state === "saving"
      ? "saving"
      : saveStatus.path === leaf.activeFilePath && saveStatus.state === "saved"
      ? "saved"
      : activeIsDirty
      ? "dirty"
      : "idle";
  const activeSaveMeta = statusMeta[activeSaveState];

  const getIcon = (type: string) => {
    switch (type) {
      case "editor": return <HiOutlineDocumentText size={14} />;
      case "metrics": return <HiOutlineChartBar size={14} />;
      default: return <HiOutlineDocumentText size={14} />;
    }
  };

  const [draggedOverIndex, setDraggedOverIndex] = React.useState<number | null>(null);
  const [tabMenu, setTabMenu] = React.useState<{ x: number; y: number; path: string; includeActions?: boolean } | null>(null);
  const tabShortcutNumbers = React.useMemo(
    () => new Map(
      getWorkspaceTabs(workspaceLayout.rootContainer)
        .slice(0, 9)
        .map(({ paneId, filePath }, index) => [`${paneId}\0${filePath}`, index + 1]),
    ),
    [workspaceLayout],
  );

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
  const openFileInPane = (filePath = leaf.activeFilePath) => {
    splitPane({ id: leaf.id, direction: "horizontal", filePath });
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
      data-pane-id={leaf.id}
      className={`h-full flex flex-col transition-all duration-300 overflow-hidden bg-paper-pale dark:bg-paper-dark ${
        isActive ? "z-10" : ""
      } ${isDimmed ? "opacity-40 saturate-50" : ""}`}
      onClick={() => setActivePaneId(leaf.id)}
    >
      {/* Pane tabs stay visible on desktop as the editor's single app header. */}
      {!isMobileChrome && (
      <div className="shrink-0 relative">
      <div
        ref={tabBarRowRef}
        className="flex items-center bg-chrome/80 backdrop-blur-2xl border-b border-edge-subtle h-11 shrink-0 relative z-20 px-2 sm:px-3"
      >
        {/* Scrollable tabs strip */}
          <div
            className="flex items-center flex-1 overflow-x-auto overflow-y-hidden scrollbar-none h-full px-1.5 min-w-0"
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
                shortcutNumber={tabShortcutNumbers.get(`${leaf.id}\0${path}`)}
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
          <div className="flex items-center gap-0.5 mx-1 pl-1 pr-1 shrink-0 h-8 rounded-xl bg-surface-raised/70 z-20">
            {isActive && leaf.openFilePaths.length > 0 && (
              <>
                {!hideCopyMarkdown && (
                  <Tooltip label="Copy Markdown">
                    <Button
                      variant="icon"
                      onClick={handleCopy}
                      aria-label="Copy Markdown"
                      className="w-8 h-8 flex items-center justify-center text-ink-muted hover:text-sage transition-all rounded-lg"
                    >
                      <HiOutlineClipboardCopy size={18} />
                    </Button>
                  </Tooltip>
                )}
                <Tooltip
                  label={activeSaveState === "error" ? (saveStatus.message || activeSaveMeta.title) : activeSaveMeta.title}
                  shortcut={formatShortcut("S")}
                >
                  <Button
                    variant="icon"
                    onClick={handleSave}
                    disabled={activeSaveState === "saving"}
                    aria-label={`Save — ${activeSaveMeta.title}`}
                    className="w-8 h-8 flex items-center justify-center transition-all rounded-lg disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {activeSaveState === "saving" ? (
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-edge border-t-sage animate-spin" />
                    ) : activeSaveMeta.Icon ? (
                      // Colored directly on the icon rather than the Button
                      // wrapper — Button's own base classes (variant="icon")
                      // set a text color too, and since both are plain
                      // utility classes at equal specificity, whichever
                      // lands later in Tailwind's generated stylesheet wins
                      // regardless of the order they're listed in here. A
                      // class on the icon itself always beats an inherited
                      // value from its parent, so it can't be shadowed that way.
                      <activeSaveMeta.Icon size={18} className={activeSaveState === "idle" ? undefined : activeSaveMeta.className} />
                    ) : (
                      <HiOutlineSave size={18} />
                    )}
                  </Button>
                </Tooltip>
                <div className="w-px h-4 bg-edge-subtle mx-1 opacity-70" />
                <Tooltip label="Tab options">
                  <Button
                    variant="icon"
                    onClick={(e) => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setTabMenu({ x: rect.left, y: rect.bottom + 4, path: leaf.activeFilePath || "draft", includeActions: true });
                    }}
                    aria-label="Tab options"
                    className="w-8 h-8 flex items-center justify-center text-ink-muted hover:text-ink-light dark:hover:text-ink-dark transition-all rounded-lg"
                  >
                    <HiOutlineDotsHorizontal size={16} />
                  </Button>
                </Tooltip>
              </>
            )}
            {!hideSplitRight && (
              <Tooltip label="Open in pane" position="bottom-end">
                <Button
                  variant="icon"
                  onClick={() => openFileInPane()}
                  aria-label="Open in pane"
                  className="w-8 h-8 flex items-center justify-center text-ink-muted hover:text-ink-light dark:hover:text-ink-dark transition-all rounded-lg"
                >
                  <VscSplitHorizontal size={16} />
                </Button>
              </Tooltip>
            )}
            {!isOnlyPane && (
              <Tooltip label="Close Pane" position="bottom-end">
                <Button
                  variant="icon"
                  onClick={() => closePane(leaf.id)}
                  aria-label="Close Pane"
                  className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-red-500 transition-all rounded-lg"
                >
                  <HiOutlineX size={18} />
                </Button>
              </Tooltip>
            )}
          </div>
      </div>
      </div>
      )}

      {/* Pane Content */}
      <div className="flex-1 overscroll-none overflow-auto">
        {leaf.openFilePaths.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6">
            <div className="flex w-full max-w-md flex-col items-center text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-edge bg-paper-light text-sage dark:bg-paper-dark-surface">
                <HiOutlineDocumentText size={26} />
              </div>
              <h2 className="text-ui-title-3 text-fg">Start writing</h2>
              <p className="mt-2 max-w-sm text-ui-footnote leading-relaxed text-fg-muted">
                {vaultHandle
                  ? "Create a new note or open one from your vault."
                  : "Create a new note, open a file from your device, or connect a vault."}
              </p>
              <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
                <Button
                  variant="primary"
                  onClick={handleEmptyNewFile}
                  className="w-full sm:w-auto"
                >
                  <HiOutlinePlus size={17} />
                  New File
                  <kbd className="rounded border border-white/30 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-medium">
                    {newFileShortcut}
                  </kbd>
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleEmptyOpenFile}
                  className="w-full sm:w-auto"
                >
                  <HiOutlineFolderOpen size={17} />
                  {vaultHandle ? "Open Note" : "Open File"}
                </Button>
              </div>
              {!vaultHandle && isVaultSupported && (
                <div className="mt-5 flex w-full flex-col items-center gap-2 border-t border-edge pt-5">
                  <p className="text-ui-caption text-fg-muted">Keep your notes together in a local vault.</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button variant="tertiary" onClick={() => openVault()}>
                      <HiOutlineDatabase size={16} />
                      Open Vault
                    </Button>
                    <Button variant="tertiary" onClick={() => setNewVaultFlowOpen(true)}>
                      <HiOutlineCollection size={16} />
                      Create Vault
                    </Button>
                  </div>
                </div>
              )}
              <Button
                variant="bare"
                onClick={() => openCommandPalette(">")}
                className="mt-5 gap-2 text-fg-muted"
              >
                <HiOutlineDotsHorizontal size={16} />
                Browse all commands
                <span className="rounded border border-edge bg-paper-light px-1.5 py-0.5 font-mono text-[10px] dark:bg-paper-dark">
                  {formatShortcut("K", { shift: true })}
                </span>
              </Button>
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
            const menuActions: TabContextMenuItem[] = [];
            if (tabMenu.includeActions && hideCopyMarkdown) {
              menuActions.push({ label: "Copy Markdown", onClick: handleCopy, icon: <HiOutlineClipboardCopy size={15} /> });
            }
            menuActions.push({
              label: "Open in pane",
              onClick: () => openFileInPane(tabMenu.path),
              icon: <VscSplitHorizontal size={15} />,
            });
            const closeItems = buildTabMenuItems(tabMenu.path);
            if (menuActions.length > 0) closeItems[0] = { ...closeItems[0], divider: true };
            return [...menuActions, ...closeItems];
          })()}
          onClose={() => setTabMenu(null)}
        />
      )}
    </div>
  );
}
