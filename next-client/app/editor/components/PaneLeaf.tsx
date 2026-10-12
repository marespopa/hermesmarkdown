"use client";

import React from "react";
import { PanelLeaf } from "@/app/types/workspace";
import MarkdownEditor from "./MarkdownEditor";
import PrivateNoteGate from "./PrivateNoteGate";
import TabContextMenu, { TabContextMenuItem } from "./TabContextMenu";
import { useAtom } from "jotai";
import { atom_activePaneId, atom_fileContent, atom_openFiles, atom_splitPane, atom_closePane, atom_activeFilePath, atom_saveStatus, atom_workspaceLayout, getWorkspaceTabs } from "@/app/atoms/atoms";
import { atom_sidebarOpen } from "@/app/atoms/ui-atoms";
import { atom_materializedDraftPath } from "@/app/atoms/file-atoms";
import { HiOutlineDocumentText, HiOutlineChartBar, HiOutlineClipboardCopy, HiOutlineViewBoards } from "react-icons/hi";
import { VscLayoutSidebarLeftOff } from "react-icons/vsc";
import PaneTab, { TabSaveState } from "./PaneTab";
import PaneActions from "./PaneActions";
import PaneToolbarButton from "./PaneToolbarButton";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useAtomValue } from "jotai";
import { formatShortcut } from "@/app/utils/platform";
import { getFirstLeaf, getTopTrailingLeaf } from "@/app/atoms/utils";
import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";
import { usePaneFileActions } from "../hooks/use-pane-file-actions";
import { useTabDragDrop } from "../hooks/use-tab-drag-drop";
import PaneEmptyState from "./PaneEmptyState";
import PaneWindowActions from "./PaneWindowActions";
import TabStripScroller from "./TabStripScroller";
import { PANE_HEADER_CLASS, PANE_HEADER_HEIGHT, PANE_ICON_SIZE, PANE_SECTION_CLASS } from "./pane-header-classes";

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
  // Window-wide controls sit at fixed window corners — Show sidebar in the
  // top-left pane, the rest in the top-right one — not in whichever pane
  // has focus.
  const hostsSidebarToggle = getFirstLeaf(workspaceLayout.rootContainer).id === leaf.id;
  const hostsWindowActions = getTopTrailingLeaf(workspaceLayout.rootContainer).id === leaf.id;
  const isMobileChrome = useIsMobileChrome();

  const { openOrCreateLink } = useFileSystem();
  const filePath = leaf.activeFilePath || "draft";
  const [content, setContent] = useAtom(atom_fileContent(filePath));
  const [sidebarOpen, setSidebarOpen] = useAtom(atom_sidebarOpen);

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

  const { handleSave, handleCopy, closeTabWithAutosave, buildTabMenuItems } = usePaneFileActions(leaf);

  // Drives the toolbar's Save button.
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

  const getIcon = (type: string) => {
    switch (type) {
      case "editor": return <HiOutlineDocumentText size={14} />;
      case "metrics": return <HiOutlineChartBar size={14} />;
      default: return <HiOutlineDocumentText size={14} />;
    }
  };

  const [tabMenu, setTabMenu] = React.useState<{ x: number; y: number; path: string } | null>(null);
  const tabShortcutNumbers = React.useMemo(
    () => new Map(
      getWorkspaceTabs(workspaceLayout.rootContainer)
        .slice(0, 9)
        .map(({ paneId, filePath }, index) => [`${paneId}\0${filePath}`, index + 1]),
    ),
    [workspaceLayout],
  );

  const hasFiles = leaf.openFilePaths.length > 0;
  const openFileInPane = (filePath = leaf.activeFilePath) => {
    splitPane({ id: leaf.id, direction: "horizontal", filePath });
  };
  const { draggedOverIndex, handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop } = useTabDragDrop(leaf.id);

  return (
    <div
      data-pane-id={leaf.id}
      className={`typing-page relative h-full flex flex-col transition-all duration-300 overflow-hidden bg-paper-pale dark:bg-paper-dark ${
        isActive ? "z-10" : ""
      }`}
      onClick={() => setActivePaneId(leaf.id)}
    >
      {/* Pane tabs are the editor's desktop header, even for a single note. */}
      {!isMobileChrome && (
      <div className="shrink-0 relative">
      <div className={`typing-chrome ${PANE_HEADER_CLASS} ${PANE_HEADER_HEIGHT}`}>
        {/* Show sidebar sits at the far left while the sidebar is hidden; once
            it's open, the sidebar's own header carries the hide button. Its
            right margin matches the header's left padding (px-2 sm:px-3), so it
            sits evenly between edge and tabs. Home lives in the sidebar. */}
        {hostsSidebarToggle && !sidebarOpen && (
          <div className={`${PANE_SECTION_CLASS} !ml-0 mr-2 sm:mr-3`}>
            <PaneToolbarButton
              icon={<VscLayoutSidebarLeftOff size={PANE_ICON_SIZE} />}
              label="Sidebar"
              tooltip="Show sidebar"
              shortcut={formatShortcut("S", { alt: true })}
              tooltipPosition="bottom-start"
              onClick={() => setSidebarOpen(true)}
            />
          </div>
        )}
        {/* Scrollable tabs strip */}
          <TabStripScroller
            className="flex items-center flex-1 overflow-x-auto overflow-y-hidden scrollbar-none h-full px-1.5 min-w-0"
            onDragOver={(e) => handleDragOver(e)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, leaf.openFilePaths.length)}
          >
          {leaf.openFilePaths.map((path, index) => {
            const fileState = openFiles[path];
            const fileName = fileState?.fileName || path.split("/").pop() || "Untitled";
            const isDirty = fileState && fileState.content !== fileState.lastSavedContent;
            const tabSaveState: TabSaveState =
              saveStatus.path === path && saveStatus.state === "error"
                ? "error"
                : saveStatus.path === path && saveStatus.state === "saving"
                ? "saving"
                : saveStatus.path === path && saveStatus.state === "saved"
                ? "saved"
                : isDirty
                ? "dirty"
                : "idle";

            return (
              <PaneTab
                key={path}
                fileName={fileName}
                shortcutNumber={tabShortcutNumbers.get(`${leaf.id}\0${path}`)}
                isActive={leaf.activeFilePath === path}
                saveState={tabSaveState}
                saveErrorMessage={saveStatus.message}
                isDraggedOver={draggedOverIndex === index}
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
          </TabStripScroller>{/* end scrollable tabs strip */}

          {/* This pane's own section — the same in every pane, focused or
              not, so the header never reflows when focus moves. */}
          <PaneActions
            hasFiles={hasFiles}
            saveState={activeSaveState}
            saveErrorMessage={saveStatus.message}
            showClose={!isOnlyPane}
            onSave={handleSave}
            onClosePane={() => closePane(leaf.id)}
          />
          {hostsWindowActions && <PaneWindowActions />}
      </div>
      </div>
      )}

      {/* Pane Content */}
      <div className="flex-1 min-h-0 overscroll-none overflow-auto">
        {leaf.openFilePaths.length === 0 ? (
          <PaneEmptyState onLoadDraft={setContent} />
        ) : leaf.type === "editor" ? (
          // The gate carries the editor's key, so its "already shown" latch
          // follows the editor instance (a draft saved as a file keeps both).
          <PrivateNoteGate key={editorKeyRef.current.key} filePath={filePath} content={content} isActivePane={isActive}>
            <MarkdownEditor
              value={content}
              onChange={setContent}
              filePath={leaf.activeFilePath || "draft"}
              onWikiLinkClick={openOrCreateLink}
              placeholder={`Editing ${leaf.activeFilePath || "Draft"}...`}
              isActivePane={isActive}
              isSplit={!isOnlyPane}
            />
          </PrivateNoteGate>
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
            if (tabMenu.path === (leaf.activeFilePath || "draft")) {
              menuActions.push({ label: "Copy Markdown", onClick: handleCopy, icon: <HiOutlineClipboardCopy size={15} /> });
            }
            menuActions.push({
              label: "Open in pane",
              onClick: () => openFileInPane(tabMenu.path),
              icon: <HiOutlineViewBoards size={15} />,
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
