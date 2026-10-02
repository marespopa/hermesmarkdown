"use client";

import React from "react";
import { PanelLeaf } from "@/app/types/workspace";
import MarkdownEditor from "./MarkdownEditor";
import SensitiveNoteGate from "./SensitiveNoteGate";
import TabContextMenu, { TabContextMenuItem } from "./TabContextMenu";
import { useAtom, useSetAtom } from "jotai";
import { atom_activePaneId, atom_fileContent, atom_openFiles, atom_splitPane, atom_closePane, atom_activeFilePath, atom_saveStatus, atom_workspaceLayout, getWorkspaceTabs } from "@/app/atoms/atoms";
import { atom_homeFeedOpen, atom_isVoicePreviewVisible, atom_toolbarHidden } from "@/app/atoms/ui-atoms";
import { atom_materializedDraftPath } from "@/app/atoms/file-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { HiOutlineDocumentText, HiOutlineChartBar, HiOutlineXCircle, HiOutlineClipboardCopy, HiOutlineHome, HiOutlineViewBoards, HiOutlineChevronDown } from "react-icons/hi";
import PaneTab, { SaveStateIcon, TabSaveState, statusMeta } from "./PaneTab";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useAtomValue } from "jotai";
import Button from "../../components/Button";
import Tooltip from "@/app/components/Tooltip";
import { formatShortcut } from "@/app/utils/platform";
import { getFirstLeaf, getTopTrailingLeaf } from "@/app/atoms/utils";
import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";
import { usePaneFileActions } from "../hooks/use-pane-file-actions";
import { useTabDragDrop } from "../hooks/use-tab-drag-drop";
import PaneEmptyState from "./PaneEmptyState";
import PaneWindowActions from "./PaneWindowActions";
import TabStripScroller from "./TabStripScroller";
import { PANE_ACTION_BUTTON_CLASS, PANE_ACTIONS_CLASS, PANE_DIVIDER_CLASS, PANE_HEADER_CLASS, PANE_ICON_SIZE } from "./pane-header-classes";

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
  // Window-wide controls sit at fixed window corners — Home in the top-left
  // pane, the rest in the top-right one — not in whichever pane has focus.
  const hostsHome = getFirstLeaf(workspaceLayout.rootContainer).id === leaf.id;
  const hostsWindowActions = getTopTrailingLeaf(workspaceLayout.rootContainer).id === leaf.id;
  const isMobileChrome = useIsMobileChrome();

  const { openFileByName } = useFileSystem();
  const filePath = leaf.activeFilePath || "draft";
  const [content, setContent] = useAtom(atom_fileContent(filePath));
  const hasVault = !!useAtomValue(atom_vaultHandle);
  const setHomeFeedOpen = useSetAtom(atom_homeFeedOpen);
  const [toolbarHidden, setToolbarHidden] = useAtom(atom_toolbarHidden);

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

  const [tabMenu, setTabMenu] = React.useState<{ x: number; y: number; path: string } | null>(null);
  const tabShortcutNumbers = React.useMemo(
    () => new Map(
      getWorkspaceTabs(workspaceLayout.rootContainer)
        .slice(0, 9)
        .map(({ paneId, filePath }, index) => [`${paneId}\0${filePath}`, index + 1]),
    ),
    [workspaceLayout],
  );

  // Progressive collapse: as the pane narrows (e.g. after a split), fold
  // lower-priority actions into the active tab's context menu instead of letting
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
  // The top-right pane also carries the window actions, so it collapses sooner.
  const reservedWidth = hostsWindowActions ? 264 : 0;
  const hideCopyMarkdown = tabBarRowWidth < 240 + reservedWidth;
  const hideSplitRight = tabBarRowWidth < 160 + reservedWidth;
  const hasFiles = leaf.openFilePaths.length > 0;
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
      {/* Hidden toolbar slides up under the pane's top edge (the pane clips
          it); `inert` keeps its controls out of the tab order meanwhile. */}
      {!isMobileChrome && (
      <div
        className={`shrink-0 relative transition-[margin-top] duration-200 ease-out motion-reduce:transition-none ${toolbarHidden ? "-mt-11" : "mt-0"}`}
        inert={toolbarHidden}
      >
      <div
        ref={tabBarRowRef}
        className={PANE_HEADER_CLASS}
      >
        {/* Home stays at the far left. */}
        {hasVault && hostsHome && (
          <div className={`${PANE_ACTIONS_CLASS} !ml-0`}>
            <Tooltip label="Home feed" position="bottom">
              <Button
                variant="icon"
                onClick={() => setHomeFeedOpen(true)}
                aria-label="Home feed"
                className={PANE_ACTION_BUTTON_CLASS}
              >
                <HiOutlineHome size={PANE_ICON_SIZE} />
              </Button>
            </Tooltip>
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

          </TabStripScroller>{/* end scrollable tabs strip */}

          {/* This pane's actions — the same in every pane, focused or not,
              so the header never reflows when focus moves. */}
          <div className={PANE_ACTIONS_CLASS} role="toolbar" aria-label="Pane">
            {!hideCopyMarkdown && (
              <Tooltip label="Copy Markdown">
                <Button
                  variant="icon"
                  onClick={handleCopy}
                  disabled={!hasFiles}
                  aria-label="Copy Markdown"
                  className={PANE_ACTION_BUTTON_CLASS}
                >
                  <HiOutlineClipboardCopy size={PANE_ICON_SIZE} />
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
                disabled={!hasFiles || activeSaveState === "saving"}
                aria-label={`Save — ${activeSaveMeta.title}`}
                className={PANE_ACTION_BUTTON_CLASS}
              >
                {/* Colored on the icon, not the Button: variant="icon" sets
                    its own text color at equal specificity, so a wrapper
                    class could lose depending on Tailwind's output order. */}
                <SaveStateIcon
                  state={activeSaveState}
                  size={PANE_ICON_SIZE}
                  className={activeSaveState === "idle" ? undefined : activeSaveMeta.className}
                />
              </Button>
            </Tooltip>
            {(!hideSplitRight || !isOnlyPane) && <div className={PANE_DIVIDER_CLASS} />}
            {!hideSplitRight && (
              <Tooltip label="Split Right" position="bottom-end">
                <Button
                  variant="icon"
                  onClick={() => openFileInPane()}
                  disabled={!hasFiles}
                  aria-label="Split Right"
                  className={PANE_ACTION_BUTTON_CLASS}
                >
                  <HiOutlineViewBoards size={PANE_ICON_SIZE} />
                </Button>
              </Tooltip>
            )}
            {!isOnlyPane && (
              <Tooltip label="Close Pane" position="bottom-end">
                <Button
                  variant="icon"
                  onClick={() => closePane(leaf.id)}
                  aria-label="Close Pane"
                  className={PANE_ACTION_BUTTON_CLASS}
                >
                  <HiOutlineXCircle size={PANE_ICON_SIZE} />
                </Button>
              </Tooltip>
            )}
          </div>
          {hostsWindowActions && <PaneWindowActions />}
      </div>
      </div>
      )}

      {/* While hidden, the top-right pane (home of the window actions) keeps a
          small handle to bring the toolbar back. */}
      {!isMobileChrome && toolbarHidden && hostsWindowActions && (
        <div className="absolute top-1.5 right-3 z-30">
          <Tooltip label="Show toolbar" shortcut={formatShortcut("T", { alt: true })} position="bottom-end">
            <Button
              variant="icon"
              onClick={() => setToolbarHidden(false)}
              aria-label="Show toolbar"
              className="w-8 h-6 flex items-center justify-center rounded-full bg-surface-raised/70 backdrop-blur text-fg-faint opacity-60 hover:opacity-100 hover:text-fg focus-visible:opacity-100 transition-opacity"
            >
              <HiOutlineChevronDown size={14} />
            </Button>
          </Tooltip>
        </div>
      )}

      {/* Pane Content */}
      <div className="flex-1 overscroll-none overflow-auto">
        {leaf.openFilePaths.length === 0 ? (
          <PaneEmptyState onLoadDraft={setContent} />
        ) : leaf.type === "editor" ? (
          // The gate carries the editor's key, so its "already shown" latch
          // follows the editor instance (a draft saved as a file keeps both).
          <SensitiveNoteGate key={editorKeyRef.current.key} filePath={filePath} content={content} isActivePane={isActive}>
            <MarkdownEditor
              value={content}
              onChange={setContent}
              filePath={leaf.activeFilePath || "draft"}
              onWikiLinkClick={openFileByName}
              placeholder={`Editing ${leaf.activeFilePath || "Draft"}...`}
              isActivePane={isActive}
              isSplit={!isOnlyPane}
            />
          </SensitiveNoteGate>
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
            // A narrow header drops Copy Markdown; the active tab's menu offers it.
            if (hideCopyMarkdown && tabMenu.path === (leaf.activeFilePath || "draft")) {
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
