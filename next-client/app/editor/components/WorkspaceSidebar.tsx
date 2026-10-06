"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { HiChevronRight, HiOutlineDocumentAdd, HiOutlineDocumentText, HiOutlineDotsVertical, HiOutlineFolderAdd, HiOutlineHome } from "react-icons/hi";
import { atom_activeFilePath, atom_activePaneId, atom_openFiles, atom_workspaceLayout, findLeaf, getWorkspaceTabs } from "@/app/atoms/atoms";
import { VscLayoutSidebarLeft } from "react-icons/vsc";
import { atom_goHome, atom_homeFeedOpen, atom_sidebarOpen, atom_sidebarWidth, SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useVaultFileSearch } from "../hooks/useVaultFileSearch";
import { formatShortcut } from "@/app/utils/platform";
import { PANE_HEADER_HEIGHT, PANE_ICON_SIZE, PANE_SECTION_CLASS } from "./pane-header-classes";
import PaneToolbarButton from "./PaneToolbarButton";
import { statusDot } from "./PaneTab";
import VaultFileTree from "./VaultFileTree";
import type { VaultFileTreeController } from "./vault-tree/tree-model";

const NO_TAGS: string[] = [];

const ITEM_CLASS = "flex items-center gap-2 h-7 px-2 rounded-md text-ui-footnote text-left transition-colors";
const ITEM_CURRENT_CLASS = "bg-surface-raised text-ink-light dark:text-ink-dark font-medium";
const ITEM_IDLE_CLASS = "text-fg-muted hover:bg-black/5 dark:hover:bg-white/10 hover:text-fg";

interface SectionMenuItem {
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

// A section header's ⋯ menu (same look as a folder row's menu in the tree).
function SectionMenu({ label, items }: { label: string; items: SectionMenuItem[] }) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  useEffect(() => {
    if (!position) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setPosition(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [position]);

  return (
    <>
      <Button
        variant="unstyled"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={!!position}
        title={label}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setPosition(position ? null : { top: rect.bottom + 4, left: rect.left });
        }}
        className="shrink-0 inline-flex items-center justify-center w-6 h-6 mr-1 rounded-md text-fg-faint hover:text-fg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
      >
        <HiOutlineDotsVertical size={14} aria-hidden="true" />
      </Button>
      {position && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPosition(null)} />
          <div
            role="menu"
            aria-label={label}
            className="fixed z-50 bg-paper-light dark:bg-paper-dark backdrop-blur-xl border border-edge-subtle rounded-xl py-1 min-w-[160px] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 ease-out"
            style={position}
          >
            {items.map((item) => (
              <Button
                key={item.label}
                variant="menu-item"
                role="menuitem"
                onClick={() => {
                  setPosition(null);
                  item.onSelect();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-ui-footnote font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                {item.icon}
                {item.label}
              </Button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function Section({ title, menu, children }: { title: string; menu?: SectionMenuItem[]; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <section aria-label={title} className="flex flex-col">
      <div className="flex items-center">
        <Button
          variant="unstyled"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="flex flex-1 min-w-0 items-center gap-1 h-7 px-2 rounded-md text-[11px] font-semibold text-fg-faint hover:text-fg-muted select-none"
        >
          {/* Disclosure chevron, always shown, as in a file explorer. */}
          <HiChevronRight
            size={12}
            aria-hidden="true"
            className={`shrink-0 transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
          />
          <span className="flex-1 text-left">{title}</span>
        </Button>
        {menu && <SectionMenu label={`${title} options`} items={menu} />}
      </div>
      {expanded && <div className="flex flex-col gap-px pb-3">{children}</div>}
    </section>
  );
}

// The window's sidebar (desktop): navigation only — Home (with a vault), the
// open notes across every pane, then the vault's file tree. Commands stay in the toolbar.
// Sits on the window's leading edge; slides out when hidden
// (`atom_sidebarOpen`: hidden from its header's button, shown again from the toolbar's) and resizes by dragging its trailing edge
// (`atom_sidebarWidth`, double-click to reset).
export default function WorkspaceSidebar() {
  const [open, setOpen] = useAtom(atom_sidebarOpen);
  const [width, setWidth] = useAtom(atom_sidebarWidth);
  const workspaceLayout = useAtomValue(atom_workspaceLayout);
  const [activePaneId, setActivePaneId] = useAtom(atom_activePaneId);
  const setActiveFilePath = useSetAtom(atom_activeFilePath);
  const [homeFeedOpen, setHomeFeedOpen] = useAtom(atom_homeFeedOpen);
  const goHome = useSetAtom(atom_goHome);
  const openFiles = useAtomValue(atom_openFiles);
  const {
    vaultHandle, openFile, renameFile, deleteFile, trashItems, duplicateFile, moveItem, moveItems,
    createNewFile, createFolder, undoFileOperation,
  } = useFileSystem();
  const treeController = useRef<VaultFileTreeController | null>(null);
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

  // The tree shows no root row, so the Files ⋯ menu creates at the vault's
  // root, named in place in the tree; a folder's own menu creates inside it.
  const createAtRoot = (kind: "file" | "folder") => {
    if (treeController.current) {
      treeController.current.startCreate(kind, "");
      return;
    }
    const create = kind === "file" ? createNewFile : createFolder;
    if (vaultHandle) void create(vaultHandle);
  };

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
      {/* Header, level with the pane toolbar: the vault's name as the title,
          as in a code editor's side bar, and the button that hides the
          sidebar (the toolbar shows it again). */}
      <div className={`flex items-center gap-2 shrink-0 pl-4 pr-2 sm:pr-3 border-b border-edge-subtle ${PANE_HEADER_HEIGHT}`}>
        <h2 className="flex-1 min-w-0 truncate text-[11px] font-semibold uppercase tracking-wider text-fg-faint select-none">
          {vaultHandle?.name ?? "Workspace"}
        </h2>
        <div className={`${PANE_SECTION_CLASS} !ml-0`}>
          <PaneToolbarButton
            icon={<VscLayoutSidebarLeft size={PANE_ICON_SIZE} />}
            label="Hide sidebar"
            shortcut={formatShortcut("S", { alt: true })}
            tooltipPosition="bottom-end"
            onClick={() => setOpen(false)}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none px-2 pt-2">
        <div className="flex flex-col pb-3">
          <Button
            variant="unstyled"
            onClick={() => goHome()}
            aria-current={homeFeedOpen ? "page" : undefined}
            className={`${ITEM_CLASS} ${homeFeedOpen ? ITEM_CURRENT_CLASS : ITEM_IDLE_CLASS}`}
          >
            <HiOutlineHome size={15} aria-hidden="true" className="shrink-0 opacity-70" />
            <span className="flex-1 min-w-0 truncate">Home</span>
          </Button>
        </div>

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
          <Section
            title="Files"
            menu={[
              { label: "New Note", icon: <HiOutlineDocumentAdd size={14} className="opacity-80" />, onSelect: () => createAtRoot("file") },
              { label: "New Folder", icon: <HiOutlineFolderAdd size={14} className="opacity-80" />, onSelect: () => createAtRoot("folder") },
            ]}
          >
            <VaultFileTree
              processedFiles={allFiles}
              activeFilePath={activeTabPath}
              openFile={(handle, path) => {
                setHomeFeedOpen(false);
                void openFile(handle, path);
              }}
              renameFile={renameFile}
              deleteFile={deleteFile}
              trashItems={trashItems}
              duplicateFile={duplicateFile}
              undoFileOperation={undoFileOperation}
              controllerRef={treeController}
              isSearchActive={false}
              highlightQuery=""
              treeView
              singleClickOpen
              folderPaths={folderPaths}
              resolveFolderHandle={resolveFolderHandle}
              createNewFile={createNewFile}
              createFolder={createFolder}
              moveItem={moveItem}
              moveItems={moveItems}
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
