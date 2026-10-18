"use client";

import React from "react";
import { PanelLeaf } from "@/app/types/workspace";
import MarkdownEditor from "./MarkdownEditor";
import PrivateNoteGate from "./PrivateNoteGate";
import TabContextMenu from "./TabContextMenu";
import { useAtom } from "jotai";
import { atom_activePaneId, atom_fileContent, atom_openFiles, atom_saveStatus, atom_workspaceLayout } from "@/app/atoms/atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_materializedDraftPath } from "@/app/atoms/file-atoms";
import { HiOutlineDocumentText, HiOutlineChartBar, HiOutlineSave } from "react-icons/hi";
import { formatShortcut } from "@/app/utils/platform";
import BoardViewLoader from "./board/BoardViewLoader";
import { isBoard } from "@/app/utils/board/is-board";
import { atom_boardMarkdownPaths, atom_toggleBoardMarkdown } from "@/app/atoms/board-atoms";
import PaneTitle from "./PaneTitle";
import type { SaveState } from "./save-state";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useAtomValue, useSetAtom } from "jotai";
import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";
import { useNoteMenuItems } from "../hooks/use-note-menu-items";
import PaneEmptyState from "./PaneEmptyState";
import { SEARCH_PILL_WIDTH } from "./SearchPill";
import { atom_liveHandles } from "@/app/atoms/file-atoms";
import { atom_autosaveMode, atom_saveRequested, AUTOSAVE_DELAY, atom_sidebarOpen } from "@/app/atoms/ui-atoms";

interface PaneLeafProps {
  leaf: PanelLeaf;
}

// How long past autosave's delay an unsaved note waits before its dot shows.
const AUTOSAVE_GRACE = 1000;

// The SearchPill's height plus its offset from the top (top-1.5, h-8).
const PANE_TOP_ROOM = "48px";

export default function PaneLeaf({ leaf }: PaneLeafProps) {
  const [activePaneId, setActivePaneId] = useAtom(atom_activePaneId);
  const [openFiles] = useAtom(atom_openFiles);
  const saveStatus = useAtomValue(atom_saveStatus);
  const workspaceLayout = useAtomValue(atom_workspaceLayout);
  const isOnlyPane = "type" in workspaceLayout.rootContainer;
  const isMobileChrome = useIsMobileChrome();

  const { openOrCreateLink, renameFile } = useFileSystem();
  const hasVault = !!useAtomValue(atom_vaultHandle);
  const filePath = leaf.activeFilePath || "draft";
  const [content, setContent] = useAtom(atom_fileContent(filePath));
  // A board (see board/) shows as a canvas unless opened as Markdown.
  const boardMarkdownPaths = useAtomValue(atom_boardMarkdownPaths);
  const toggleBoardMarkdown = useSetAtom(atom_toggleBoardMarkdown);
  const isBoardFile = React.useMemo(() => isBoard(filePath, content), [filePath, content]);
  const showBoard = isBoardFile && !boardMarkdownPaths.has(filePath);

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

  const noteMenuItems = useNoteMenuItems(leaf);

  // Drives the title's save dot.
  const activeFileState = leaf.activeFilePath ? openFiles[leaf.activeFilePath] : undefined;
  const activeIsDirty = !!activeFileState && activeFileState.content !== activeFileState.lastSavedContent;
  const savedState: SaveState =
    saveStatus.path === leaf.activeFilePath && saveStatus.state === "error"
      ? "error"
      : saveStatus.path === leaf.activeFilePath && saveStatus.state === "saving"
      ? "saving"
      : saveStatus.path === leaf.activeFilePath && saveStatus.state === "saved"
      ? "saved"
      : activeIsDirty
      ? "dirty"
      : "idle";
  // With autosave on, unsaved changes are about to save on their own: the
  // dot stays hidden through autosave's wait (restarted by every edit), and
  // shows only if the note is still unsaved past it. Errors always show.
  const autosave = useAtomValue(atom_autosaveMode) === "afterDelay";
  const [saveLate, setSaveLate] = React.useState(false);
  React.useEffect(() => {
    setSaveLate(false);
    if (!autosave || !activeIsDirty) return;
    const timer = setTimeout(() => setSaveLate(true), AUTOSAVE_DELAY + AUTOSAVE_GRACE);
    return () => clearTimeout(timer);
  }, [autosave, activeIsDirty, activeFileState?.content, leaf.activeFilePath]);
  const activeSaveState: SaveState =
    autosave && !saveLate && (savedState === "dirty" || savedState === "saving") ? "idle" : savedState;

  const getIcon = (type: string) => {
    switch (type) {
      case "editor": return <HiOutlineDocumentText size={14} />;
      case "metrics": return <HiOutlineChartBar size={14} />;
      default: return <HiOutlineDocumentText size={14} />;
    }
  };

  const [tabMenu, setTabMenu] = React.useState<{ x: number; y: number; path: string; fromButton?: boolean } | null>(null);
  const menuButtonRef = React.useRef<HTMLButtonElement>(null);
  // The note in front, as the title shows it, and its folder.
  const activeTitle = (activeFileState?.fileName || leaf.activeFilePath?.split("/").pop() || "Untitled").replace(/\.md$/i, "");
  const activeFolder = leaf.activeFilePath && leaf.activeFilePath !== "draft" ? leaf.activeFilePath.split("/").slice(0, -1).join("/") : "";
  // A vault note renames in place from its title; the draft has no file yet.
  const activeHandle = useAtomValue(atom_liveHandles(filePath));
  const canRename = hasVault && filePath !== "draft" && !!activeHandle;
  const renameActive = (typed: string) => {
    if (!activeHandle) return;
    const name = /\.md$/i.test(filePath) && !/\.md$/i.test(typed) ? `${typed}.md` : typed;
    void renameFile(activeHandle, name, filePath);
  };
  const sidebarOpen = useAtomValue(atom_sidebarOpen);
  const requestSave = useSetAtom(atom_saveRequested);
  // Saves the note in front, so this pane's note comes forward first.
  const saveActive = () => { setActivePaneId(leaf.id); requestSave(true); };
  // Whether the note in front is scrolled down: shows the band behind the title.
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => setScrolled(false), [filePath]);

  const hasFiles = leaf.openFilePaths.length > 0;

  return (
    <div
      data-pane-id={leaf.id}
      className={`relative h-full flex flex-col transition-all duration-300 overflow-hidden ${
        isActive ? "z-10" : ""
      }`}
      // Room at the top for the SearchPill: CodeMirror keeps the caret
      // below it, and a board's own toolbar starts under it.
      style={isMobileChrome ? undefined : ({ "--pane-top-room": PANE_TOP_ROOM } as React.CSSProperties)}
      onClick={() => setActivePaneId(leaf.id)}
      // Scroll doesn't bubble: catch the note's vertical scroller (CodeMirror,
      // a board) on the way down; horizontal ones (wide tables) don't count.
      onScrollCapture={(event) => {
        const el = event.target as HTMLElement;
        if (el.scrollHeight <= el.clientHeight) return;
        setScrolled(el.scrollTop > 0);
      }}
    >
      {/* No toolbar (desktop): a quiet header at the pane's top left, the
          note's folder and name. A click on the name renames the note in
          place; a right-click opens its menu. The command palette's SearchPill
          sits in the window's top-right corner, and Show sidebar sits in the
          top-left one while the sidebar is hidden (EditorShell). It floats
          over the page's top margin, so the text starts clear of it. */}
      {!isMobileChrome && scrolled && (
        // Once scrolled, text goes under a solid band the height of the top
        // room, then fades out over a short gradient, so it never runs into
        // the title. At the top there's none, so nothing at the start of the
        // note (the Properties panel) is covered.
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col">
          <div style={{ height: PANE_TOP_ROOM }} className="bg-surface" />
          <div className="h-4 bg-gradient-to-b from-surface to-transparent" />
        </div>
      )}
      {!isMobileChrome && (
        <div
          // Clear of the SearchPill in the top-right corner (EditorShell).
          style={{ paddingRight: `calc(${SEARCH_PILL_WIDTH} + 3rem)` }}
          className={`pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-start ${sidebarOpen ? "pl-3" : "pl-12"}`}
        >
          <div className="pointer-events-auto min-w-0">
            <PaneTitle
              title={hasFiles ? activeTitle : null}
              folder={hasFiles ? activeFolder : ""}
              saveState={activeSaveState}
              saveErrorMessage={saveStatus.message}
              onRename={hasFiles && canRename ? renameActive : undefined}
              onSave={hasFiles ? saveActive : undefined}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!hasFiles) return;
                setActivePaneId(leaf.id);
                setTabMenu({ x: e.clientX, y: e.clientY, path: leaf.activeFilePath || "draft" });
              }}
              // The same menu from the ⋯ button, under it; a second press closes it.
              onMenu={hasFiles ? (anchor) => {
                if (tabMenu?.fromButton) return setTabMenu(null);
                setActivePaneId(leaf.id);
                setTabMenu({ x: anchor.left, y: anchor.bottom + 4, path: leaf.activeFilePath || "draft", fromButton: true });
              } : undefined}
              menuOpen={!!tabMenu?.fromButton}
              menuButtonRef={menuButtonRef}
            />
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
          // The title's menu always belongs to the note in front, so it
          // starts with Save (Ctrl/Cmd+S); the shared note menu follows.
          items={[
            { label: "Save", icon: <HiOutlineSave size={15} />, shortcut: formatShortcut("S"), disabled: activeSaveState === "saving", onClick: saveActive },
            ...noteMenuItems(tabMenu.path).map((item, i) => (i === 0 ? { ...item, divider: true } : item)),
          ]}
          label="Note actions"
          anchorRef={tabMenu.fromButton ? menuButtonRef : undefined}
          onClose={() => setTabMenu(null)}
        />
      )}
    </div>
  );
}
