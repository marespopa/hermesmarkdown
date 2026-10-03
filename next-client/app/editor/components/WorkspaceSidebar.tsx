"use client";

import React, { useCallback, useRef, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { HiChevronRight, HiOutlineChevronLeft, HiOutlineDocumentText, HiOutlineHome } from "react-icons/hi";
import { atom_activeFilePath, atom_activePaneId, atom_openFiles, atom_workspaceLayout, findLeaf, getWorkspaceTabs } from "@/app/atoms/atoms";
import { atom_homeFeedOpen, atom_sidebarOpen, atom_sidebarWidth, atom_toolbarDisplayMode, SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import Tooltip from "@/app/components/Tooltip";
import { formatShortcut } from "@/app/utils/platform";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useVaultFileSearch } from "../hooks/useVaultFileSearch";
import { PANE_ACTION_BUTTON_CLASS, PANE_HEADER_HEIGHT, PANE_ICON_SIZE } from "./pane-header-classes";
import { statusDot } from "./PaneTab";
import VaultFileTree from "./VaultFileTree";

const NO_TAGS: string[] = [];

const ITEM_CLASS = "flex items-center gap-2 h-7 px-2 rounded-md text-ui-footnote text-left transition-colors";
const ITEM_CURRENT_CLASS = "bg-surface-raised text-ink-light dark:text-ink-dark font-medium";
const ITEM_IDLE_CLASS = "text-fg-muted hover:bg-black/5 dark:hover:bg-white/10 hover:text-fg";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <section aria-label={title} className="flex flex-col">
      <Button
        variant="unstyled"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="group flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-semibold text-fg-faint hover:text-fg-muted select-none"
      >
        <span className="flex-1 text-left">{title}</span>
        <HiChevronRight
          size={12}
          aria-hidden="true"
          className={`opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-[opacity,transform] ${expanded ? "rotate-90" : ""}`}
        />
      </Button>
      {expanded && <div className="flex flex-col gap-px pb-3">{children}</div>}
    </section>
  );
}

// The window's sidebar (desktop): navigation only — Home (with a vault), the
// open notes across every pane, then the vault's file tree. Commands stay in the toolbar.
// Sits on the window's leading edge; slides out when hidden
// (`atom_sidebarOpen`; the chevron in its header hides it, the toolbar's
// Sidebar button brings it back) and resizes by dragging its trailing edge
// (`atom_sidebarWidth`, double-click to reset).
export default function WorkspaceSidebar() {
  const [open, setOpen] = useAtom(atom_sidebarOpen);
  const toolbarMode = useAtomValue(atom_toolbarDisplayMode);
  const [width, setWidth] = useAtom(atom_sidebarWidth);
  const workspaceLayout = useAtomValue(atom_workspaceLayout);
  const [activePaneId, setActivePaneId] = useAtom(atom_activePaneId);
  const setActiveFilePath = useSetAtom(atom_activeFilePath);
  const [homeFeedOpen, setHomeFeedOpen] = useAtom(atom_homeFeedOpen);
  const openFiles = useAtomValue(atom_openFiles);
  const { vaultHandle, openFile, renameFile, deleteFile, duplicateFile, moveItem, createNewFile, createFolder } = useFileSystem();
  const { allFiles, folderPaths } = useVaultFileSearch({ selectedTags: NO_TAGS, panel: "files" });

  const tabs = getWorkspaceTabs(workspaceLayout.rootContainer);
  const activeLeaf = findLeaf(workspaceLayout.rootContainer, activePaneId);
  const activeTabPath = activeLeaf?.activeFilePath ?? null;

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

  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { startX: event.clientX, startWidth: width };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const next = dragRef.current.startWidth + event.clientX - dragRef.current.startX;
    setWidth(Math.round(Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, next))));
  };
  const handlePointerUp = () => {
    dragRef.current = null;
  };

  return (
    <nav
      aria-label="Sidebar"
      inert={!open}
      style={{ width, marginLeft: open ? 0 : -width }}
      className="relative shrink-0 h-full flex flex-col bg-chrome border-r border-edge-subtle transition-[margin-left] duration-200 ease-out motion-reduce:transition-none"
    >
      {/* Header, level with the pane toolbar: the hide chevron on the right. */}
      <div className={`flex items-center justify-end shrink-0 px-2 border-b border-edge-subtle ${PANE_HEADER_HEIGHT[toolbarMode]}`}>
        <Tooltip label="Hide sidebar" shortcut={formatShortcut("S", { alt: true })} position="bottom-end" portal>
          <Button
            variant="unstyled"
            onClick={() => setOpen(false)}
            aria-label="Hide sidebar"
            className={PANE_ACTION_BUTTON_CLASS.icon}
          >
            <HiOutlineChevronLeft size={PANE_ICON_SIZE} aria-hidden="true" />
          </Button>
        </Tooltip>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none px-2 pt-2">
        {vaultHandle && (
          <div className="flex flex-col pb-3">
            <Button
              variant="unstyled"
              onClick={() => setHomeFeedOpen(true)}
              aria-current={homeFeedOpen ? "page" : undefined}
              className={`${ITEM_CLASS} ${homeFeedOpen ? ITEM_CURRENT_CLASS : ITEM_IDLE_CLASS}`}
            >
              <HiOutlineHome size={15} aria-hidden="true" className="shrink-0 opacity-70" />
              <span className="flex-1 min-w-0 truncate">Home</span>
            </Button>
          </div>
        )}

        <Section title="Open Notes">
          {tabs.length === 0 ? (
            <p className="px-2 py-1 text-ui-footnote text-fg-faint">No open notes</p>
          ) : (
            tabs.map(({ paneId, filePath }) => {
              const fileState = openFiles[filePath];
              const name = fileState?.fileName || filePath.split("/").pop() || "Untitled";
              const isDirty = !!fileState && fileState.content !== fileState.lastSavedContent;
              const isCurrent = !homeFeedOpen && paneId === activePaneId && filePath === activeTabPath;
              return (
                <Button
                  key={`${paneId}\0${filePath}`}
                  variant="unstyled"
                  onClick={() => {
                    setHomeFeedOpen(false);
                    setActivePaneId(paneId);
                    setActiveFilePath(filePath);
                  }}
                  aria-current={isCurrent ? "page" : undefined}
                  title={filePath}
                  className={`${ITEM_CLASS} ${isCurrent ? ITEM_CURRENT_CLASS : ITEM_IDLE_CLASS}`}
                >
                  <HiOutlineDocumentText size={15} aria-hidden="true" className="shrink-0 opacity-70" />
                  <span className="flex-1 min-w-0 truncate">{name}</span>
                  {isDirty && <span aria-label="Unsaved changes" className={`shrink-0 w-1.5 h-1.5 rounded-full ${statusDot.dirty.className}`} />}
                </Button>
              );
            })
          )}
        </Section>

        {vaultHandle && (
          <Section title="Files">
            <VaultFileTree
              processedFiles={allFiles}
              activeFilePath={activeTabPath}
              openFile={(handle, path) => {
                setHomeFeedOpen(false);
                void openFile(handle, path);
              }}
              renameFile={renameFile}
              deleteFile={deleteFile}
              duplicateFile={duplicateFile}
              isSearchActive={false}
              highlightQuery=""
              treeView
              folderPaths={folderPaths}
              resolveFolderHandle={resolveFolderHandle}
              createNewFile={createNewFile}
              createFolder={createFolder}
              moveItem={moveItem}
            />
          </Section>
        )}
      </div>

      {/* Resize handle on the trailing edge. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        aria-valuemin={SIDEBAR_MIN_WIDTH}
        aria-valuemax={SIDEBAR_MAX_WIDTH}
        aria-valuenow={width}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={() => setWidth(256)}
        className="absolute top-0 -right-1 bottom-0 w-2 cursor-col-resize z-10"
      />
    </nav>
  );
}
