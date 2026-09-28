"use client";

import React from "react";
import { PanelLeaf } from "@/app/types/workspace";
import MarkdownEditor from "./MarkdownEditor";
import TabContextMenu, { TabContextMenuItem } from "./TabContextMenu";
import { useAtom, useSetAtom } from "jotai";
import { atom_activePaneId, atom_fileContent, atom_openFiles, atom_splitPane, atom_closePane, atom_activeFilePath, atom_saveStatus, atom_workspaceLayout, getWorkspaceTabs } from "@/app/atoms/atoms";
import { atom_aiBuilderRequest, atom_homeFeedOpen, atom_isAiConfigured, atom_isVoicePreviewVisible } from "@/app/atoms/ui-atoms";
import { atom_materializedDraftPath } from "@/app/atoms/file-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { HiOutlineDocumentText, HiOutlineChartBar, HiOutlineX, HiOutlineClipboardCopy, HiOutlineSave, HiOutlineDotsHorizontal, HiOutlineHome, HiOutlineSearch, HiOutlineChatAlt2 } from "react-icons/hi";
import { VscSplitHorizontal } from "react-icons/vsc";
import PaneTab, { TabSaveState, statusMeta } from "./PaneTab";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useAtomValue } from "jotai";
import Button from "../../components/Button";
import Tooltip from "@/app/components/Tooltip";
import { formatShortcut } from "@/app/utils/platform";
import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";
import { usePaneFileActions } from "../hooks/use-pane-file-actions";
import { useTabDragDrop } from "../hooks/use-tab-drag-drop";
import PaneEmptyState from "./PaneEmptyState";
import { PANE_ACTION_BUTTON_CLASS, PANE_ACTIONS_CLASS, PANE_HEADER_CLASS } from "./pane-header-classes";
import { useCommandPalette } from "@/app/components/CommandPalette/CommandPaletteContext";

interface PaneLeafProps {
  leaf: PanelLeaf;
}

export default function PaneLeaf({ leaf }: PaneLeafProps) {
  const [activePaneId, setActivePaneId] = useAtom(atom_activePaneId);
  const [openFiles] = useAtom(atom_openFiles);
  const [, splitPane] = useAtom(atom_splitPane);
  const [, closePane] = useAtom(atom_closePane);
  const [, setActiveFilePath] = useAtom(atom_activeFilePath);
  const saveStatus = useAtomValue(atom_saveStatus);
  const workspaceLayout = useAtomValue(atom_workspaceLayout);
  const isOnlyPane = "type" in workspaceLayout.rootContainer;
  const isMobileChrome = useIsMobileChrome();

  const { openFileByName } = useFileSystem();
  const filePath = leaf.activeFilePath || "draft";
  const [content, setContent] = useAtom(atom_fileContent(filePath));
  const hasVault = !!useAtomValue(atom_vaultHandle);
  const setHomeFeedOpen = useSetAtom(atom_homeFeedOpen);
  const { open: openCommandPalette } = useCommandPalette();
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const setAiBuilderRequest = useSetAtom(atom_aiBuilderRequest);
  // Same trigger as the Ctrl/Cmd+Shift+B shortcut; the editor page opens the chat.
  const openAIChat = () => setAiBuilderRequest((value) => value + 1);

  // The editor remounts on every tab switch, except when the draft was just
  // saved as a file: that keeps the caret, scroll and undo history.
  const materializedDraftPath = useAtomValue(atom_materializedDraftPath);
  const editorKeyRef = React.useRef({ path: filePath, key: filePath, generation: 0 });
  if (editorKeyRef.current.path !== filePath) {
    const previous = editorKeyRef.current;
    const keepEditor = previous.path === "draft" && filePath === materializedDraftPath;
    const generation = previous.generation + 1;
    editorKeyRef.current = { path: filePath, key: keepEditor ? previous.key : `${filePath}#${generation}`, generation };
  }

  const isActive = activePaneId === leaf.id;
  const isVoicePreviewVisible = useAtomValue(atom_isVoicePreviewVisible);
  const isDimmed = isVoicePreviewVisible && !isActive;


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
  }, [isMobileChrome]);
  const hideCopyMarkdown = tabBarRowWidth < 440;
  const hideSplitRight = tabBarRowWidth < 360;
  const openFileInPane = (filePath = leaf.activeFilePath) => {
    splitPane({ id: leaf.id, direction: "horizontal", filePath });
  };
  const { draggedOverIndex, handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop } = useTabDragDrop(leaf.id);

  return (
    <div
      data-pane-id={leaf.id}
      className={`relative h-full flex flex-col transition-all duration-300 overflow-hidden bg-paper-pale dark:bg-paper-dark ${
        isActive ? "z-10" : ""
      } ${isDimmed ? "opacity-40 saturate-50" : ""}`}
      onClick={() => setActivePaneId(leaf.id)}
    >
      {/* Pane tabs are the editor's desktop header, even for a single note. */}
      {!isMobileChrome && (
      <div className="shrink-0 relative">
      <div
        ref={tabBarRowRef}
        className={PANE_HEADER_CLASS}
      >
        {/* Home stays at the far left. */}
        {hasVault && (
          <div className={`${PANE_ACTIONS_CLASS} !ml-0`}>
            <Tooltip label="Home feed" position="bottom">
              <Button
                variant="icon"
                onClick={() => setHomeFeedOpen(true)}
                aria-label="Home feed"
                className={PANE_ACTION_BUTTON_CLASS}
              >
                <HiOutlineHome size={17} />
              </Button>
            </Tooltip>
          </div>
        )}
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
          <div className={PANE_ACTIONS_CLASS}>
            {isActive && (
              <Tooltip label="Command palette" shortcut={formatShortcut("K")}>
                <Button
                  variant="icon"
                  onClick={() => openCommandPalette()}
                  aria-label="Command palette"
                  className={PANE_ACTION_BUTTON_CLASS}
                >
                  <HiOutlineSearch size={17} />
                </Button>
              </Tooltip>
            )}
            {isActive && isAiConfigured && (
              <Tooltip label="AI Chat" shortcut={formatShortcut("B", { shift: true })}>
                <Button
                  variant="icon"
                  onClick={openAIChat}
                  aria-label="AI Chat"
                  className={PANE_ACTION_BUTTON_CLASS}
                >
                  <HiOutlineChatAlt2 size={17} />
                </Button>
              </Tooltip>
            )}
            {isActive && leaf.openFilePaths.length > 0 && (
              <>
                {!hideCopyMarkdown && (
                  <Tooltip label="Copy Markdown">
                    <Button
                      variant="icon"
                      onClick={handleCopy}
                      aria-label="Copy Markdown"
                      className="w-8 h-8 flex items-center justify-center text-fg-muted hover:text-sage transition-all rounded-lg"
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
          <PaneEmptyState onLoadDraft={setContent} />
        ) : leaf.type === "editor" ? (
          <MarkdownEditor
            key={editorKeyRef.current.key}
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
