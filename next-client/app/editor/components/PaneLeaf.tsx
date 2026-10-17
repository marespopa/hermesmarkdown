"use client";

import React from "react";
import { PanelLeaf } from "@/app/types/workspace";
import MarkdownEditor from "./MarkdownEditor";
import PrivateNoteGate from "./PrivateNoteGate";
import TabContextMenu, { TabContextMenuItem } from "./TabContextMenu";
import { useAtom } from "jotai";
import { atom_activePaneId, atom_fileContent, atom_openFiles, atom_splitPane, atom_closePane, atom_saveStatus, atom_workspaceLayout } from "@/app/atoms/atoms";
import { atom_sidebarOpen, atom_toolbarVisible } from "@/app/atoms/ui-atoms";
import { atom_pinnedNotePaths, atom_toggleNotePin } from "@/app/atoms/note-pin-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_materializedDraftPath } from "@/app/atoms/file-atoms";
import { HiOutlineDocumentText, HiOutlineChartBar, HiOutlineClipboardCopy, HiOutlineViewBoards, HiOutlineCode, HiOutlineChevronDown, HiOutlineXCircle } from "react-icons/hi";
import BoardViewLoader from "./board/BoardViewLoader";
import { isBoard } from "@/app/utils/board/is-board";
import { atom_boardMarkdownPaths, atom_toggleBoardMarkdown } from "@/app/atoms/board-atoms";
import { VscLayoutSidebarLeftOff } from "react-icons/vsc";
import { TbPinned, TbPinnedFilled } from "react-icons/tb";
import PaneTitle from "./PaneTitle";
import type { SaveState } from "./save-state";
import PaneToolbarButton from "./PaneToolbarButton";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useAtomValue, useSetAtom } from "jotai";
import { formatShortcut } from "@/app/utils/platform";
import { getFirstLeaf, getTopTrailingLeaf } from "@/app/atoms/utils";
import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";
import { usePaneFileActions } from "../hooks/use-pane-file-actions";
import PaneEmptyState from "./PaneEmptyState";
import PaneWindowActions from "./PaneWindowActions";
import { useCommandPalette } from "@/app/components/CommandPalette/CommandPaletteContext";
import { PANE_HEADER_CLASS, PANE_HEADER_HEIGHT, PANE_HEADER_INSET, PANE_ICON_SIZE, PANE_SECTION_CLASS } from "./pane-header-classes";

interface PaneLeafProps {
  leaf: PanelLeaf;
}

export default function PaneLeaf({ leaf }: PaneLeafProps) {
  const [activePaneId, setActivePaneId] = useAtom(atom_activePaneId);
  const [openFiles] = useAtom(atom_openFiles);
  const [, splitPane] = useAtom(atom_splitPane);
  const [, closePane] = useAtom(atom_closePane);
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
  const hasVault = !!useAtomValue(atom_vaultHandle);
  const pinnedNotePaths = useAtomValue(atom_pinnedNotePaths);
  const toggleNotePin = useSetAtom(atom_toggleNotePin);
  const filePath = leaf.activeFilePath || "draft";
  const [content, setContent] = useAtom(atom_fileContent(filePath));
  // A board (see board/) shows as a canvas unless opened as Markdown.
  const boardMarkdownPaths = useAtomValue(atom_boardMarkdownPaths);
  const toggleBoardMarkdown = useSetAtom(atom_toggleBoardMarkdown);
  const isBoardFile = React.useMemo(() => isBoard(filePath, content), [filePath, content]);
  const showBoard = isBoardFile && !boardMarkdownPaths.has(filePath);
  const [sidebarOpen, setSidebarOpen] = useAtom(atom_sidebarOpen);
  // The toolbar shows unless you hide it (remembered, atom_toolbarVisible).
  const [toolbarVisible, setToolbarVisible] = useAtom(atom_toolbarVisible);
  const showHeader = !isMobileChrome && toolbarVisible;

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

  const { handleCopy, buildTabMenuItems } = usePaneFileActions(leaf);

  // Drives the title's save dot.
  const activeFileState = leaf.activeFilePath ? openFiles[leaf.activeFilePath] : undefined;
  const activeIsDirty = !!activeFileState && activeFileState.content !== activeFileState.lastSavedContent;
  const activeSaveState: SaveState =
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
  const { open: openCommandPalette } = useCommandPalette();
  // The note in front, as the title shows it.
  const activeTitle = (activeFileState?.fileName || leaf.activeFilePath?.split("/").pop() || "Untitled").replace(/\.md$/i, "");

  const hasFiles = leaf.openFilePaths.length > 0;
  const openFileInPane = (filePath = leaf.activeFilePath) => {
    splitPane({ id: leaf.id, direction: "horizontal", filePath });
  };

  return (
    <div
      data-pane-id={leaf.id}
      className={`relative h-full flex flex-col transition-all duration-300 overflow-hidden ${
        isActive ? "z-10" : ""
      }`}
      // The header floats over the content, which starts below it
      // (--pane-header-inset) and scrolls under its glass.
      style={showHeader ? ({ "--pane-header-inset": PANE_HEADER_INSET } as React.CSSProperties) : undefined}
      onClick={() => setActivePaneId(leaf.id)}
    >
      {/* The pane's quiet title bar (desktop): Show sidebar at the left
          while it's closed, the note's title in the middle (the way into
          the command palette), Close Pane in a split and the window's own
          controls at the right. It floats over the editor, so showing or
          hiding it never reflows the text. */}
      {showHeader && (
      <div
        className="absolute top-0 left-0 right-0 z-20"
      >
      <div className={`${PANE_HEADER_CLASS} ${PANE_HEADER_HEIGHT}`}>
        <div className="flex min-w-0 flex-1 basis-0 items-center">
          {hostsSidebarToggle && !sidebarOpen && (
            <div className={`${PANE_SECTION_CLASS} !ml-0`}>
              <PaneToolbarButton
                icon={<VscLayoutSidebarLeftOff size={PANE_ICON_SIZE} />}
                label="Sidebar"
                tooltip="Show sidebar"
                shortcut={formatShortcut("\\")}
                tooltipPosition="bottom-start"
                onClick={() => setSidebarOpen(true)}
              />
            </div>
          )}
        </div>
        <PaneTitle
          title={hasFiles ? activeTitle : null}
          saveState={activeSaveState}
          saveErrorMessage={saveStatus.message}
          onOpen={() => {
            setActivePaneId(leaf.id);
            openCommandPalette();
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!hasFiles) return;
            setActivePaneId(leaf.id);
            setTabMenu({ x: e.clientX, y: e.clientY, path: leaf.activeFilePath || "draft" });
          }}
        />
        <div className="flex min-w-0 flex-1 basis-0 items-center justify-end">
          {!isOnlyPane && (
            <div className={PANE_SECTION_CLASS} role="toolbar" aria-label="Pane">
              <PaneToolbarButton
                icon={<HiOutlineXCircle size={PANE_ICON_SIZE} />}
                label="Close Pane"
                tooltipPosition="bottom-end"
                onClick={() => closePane(leaf.id)}
              />
            </div>
          )}
          {hostsWindowActions && <PaneWindowActions />}
        </div>
      </div>
      </div>
      )}

      {/* With the toolbar hidden, the top-right pane keeps one way back. */}
      {!isMobileChrome && !toolbarVisible && hostsWindowActions && (
        <div className={`${PANE_SECTION_CLASS} absolute top-1.5 right-2 z-20`}>
          <PaneToolbarButton
            icon={<HiOutlineChevronDown size={PANE_ICON_SIZE} />}
            label="Show toolbar"
            shortcut={formatShortcut("\\", { shift: true })}
            tooltipPosition="bottom-end"
            onClick={() => setToolbarVisible(true)}
          />
        </div>
      )}

      {/* Pane Content */}
      {/* The editor applies the header inset inside its own scroller; any
          other content starts below the header here. */}
      <div className={`flex-1 min-h-0 overscroll-none overflow-auto ${hasFiles && leaf.type === "editor" ? "" : "pt-[var(--pane-header-inset,0px)]"}`}>
        {leaf.openFilePaths.length === 0 ? (
          <PaneEmptyState onLoadDraft={setContent} />
        ) : leaf.type === "editor" ? (
          // The gate carries the editor's key, so its "already shown" latch
          // follows the editor instance (a draft saved as a file keeps both).
          <PrivateNoteGate key={editorKeyRef.current.key} filePath={filePath} content={content} isActivePane={isActive}>
            {showBoard ? (
              <BoardViewLoader
                path={filePath}
                content={content}
                isActivePane={isActive}
                onEditAsMarkdown={() => toggleBoardMarkdown(filePath)}
              />
            ) : (
              <MarkdownEditor
                value={content}
                onChange={setContent}
                filePath={leaf.activeFilePath || "draft"}
                onWikiLinkClick={openOrCreateLink}
                placeholder={`Editing ${leaf.activeFilePath || "Draft"}...`}
                isActivePane={isActive}
                isSplit={!isOnlyPane}
              />
            )}
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
            if (tabMenu.path !== "draft" && isBoard(tabMenu.path, openFiles[tabMenu.path]?.content ?? "")) {
              menuActions.push({
                label: boardMarkdownPaths.has(tabMenu.path) ? "Open as Board" : "Edit as Markdown",
                onClick: () => toggleBoardMarkdown(tabMenu.path),
                icon: <HiOutlineCode size={15} />,
              });
            }
            // Notes in the vault can be pinned (first in the palette and in Files);
            // the unsaved draft can't.
            if (hasVault && tabMenu.path !== "draft") {
              const isPinned = pinnedNotePaths.includes(tabMenu.path);
              menuActions.push({
                label: isPinned ? "Unpin Note" : "Pin Note",
                onClick: () => toggleNotePin(tabMenu.path),
                icon: isPinned ? <TbPinnedFilled size={15} /> : <TbPinned size={15} />,
              });
            }
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
