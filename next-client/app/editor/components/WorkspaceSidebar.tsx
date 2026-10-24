"use client";

import React, { Suspense, useEffect, useRef } from "react";
import { useAtom, useAtomValue } from "jotai";
import { atom_workspaceLayout } from "@/app/atoms/atoms";
import { atom_closeSidebarWhileWriting, atom_filesFocusRequested, atom_filesRevealPath, atom_sidebarOpen, atom_sidebarWidth, SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH } from "@/app/atoms/ui-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { useVaultFileSearch } from "../hooks/useVaultFileSearch";
import SidebarFiles from "./sidebar/SidebarFiles";
import SidebarHeader from "./sidebar/SidebarHeader";
import SidebarPinned from "./sidebar/SidebarPinned";
import { useSidebarNavigation } from "./sidebar/use-sidebar-navigation";
import type { VaultFileTreeController } from "./vault-tree/tree-model";

const DEFAULT_WIDTH = 256;
// The sidebar lists the vault as it is; searching is the palette's job.
const NO_TAGS: string[] = [];

// The window's sidebar (desktop), the same on every /editor route
// (EditorShell hosts it), and kept to the library: the vault (a switcher),
// New note and Hide; the vault's Pinned items (notes, folders, tags and
// pages, kept on this device, Ctrl/Cmd+1–9), first; and the vault's
// Files, with a filter.
// Switching between open notes is the palette's (Ctrl/Cmd+K), and the note's
// outline is the editor's optional one (Ctrl/Cmd+Shift+M, EditorOutline).
// Everything else (Home, All Notes, Tags, Tasks, Templates, Trash, Export,
// Settings, Documentation, search) is the command palette's (Ctrl/Cmd+K,
// SearchPill) or the toolbar's More menu. A plain panel in the chrome colour with a hairline
// edge; it takes room, pushing the page over (EditorShell), and slides out
// when hidden. It stays open until you close it (`atom_sidebarOpen`: its
// header's button, Escape inside it or Ctrl/Cmd+\; shown again from the
// toolbar's), or, with Close Sidebar While Writing on (Settings → Editor),
// until you type in a note. Resizes by dragging its trailing edge
// (`atom_sidebarWidth`, which keeps it within its bounds; double-click to reset).
export default function WorkspaceSidebar() {
  const [open, setOpen] = useAtom(atom_sidebarOpen);
  const [width, setWidth] = useAtom(atom_sidebarWidth);
  const workspaceLayout = useAtomValue(atom_workspaceLayout);
  const hasVault = !!useAtomValue(atom_vaultHandle);
  const navigation = useSidebarNavigation();
  const treeController = useRef<VaultFileTreeController | null>(null);
  const { allFiles, folderPaths } = useVaultFileSearch({ selectedTags: NO_TAGS, panel: "files" });

  // "Show Files" (atom_showFiles): once the sidebar is open, its Files tree
  // takes keyboard focus, on the folder "Show in Files" asked for if any.
  // Without a vault there's no tree; the request lapses.
  const [filesFocusRequested, setFilesFocusRequested] = useAtom(atom_filesFocusRequested);
  const [filesRevealPath, setFilesRevealPath] = useAtom(atom_filesRevealPath);
  useEffect(() => {
    if (!filesFocusRequested || !open) return;
    if (filesRevealPath) treeController.current?.reveal(filesRevealPath);
    else treeController.current?.focus();
    setFilesFocusRequested(false);
    setFilesRevealPath(null);
  }, [filesFocusRequested, filesRevealPath, open, setFilesFocusRequested, setFilesRevealPath]);

  // Clicking in a note or opening one leaves it open. Only typing into a
  // note puts it away, and only with Close Sidebar While Writing on.
  const closeWhileWriting = useAtomValue(atom_closeSidebarWhileWriting);
  useEffect(() => {
    if (!open || !closeWhileWriting) return;
    const onBeforeInput = (event: Event) => {
      if (event.target instanceof Element && event.target.closest(".cm-editor")) setOpen(false);
    };
    document.addEventListener("beforeinput", onBeforeInput, true);
    return () => document.removeEventListener("beforeinput", onBeforeInput, true);
  }, [open, closeWhileWriting, setOpen]);

  // The note in front, on the editor only.
  const onWorkspace = navigation.onEditor;
  const activeTabPath = workspaceLayout.rootContainer.activeFilePath ?? null;
  const currentPath = onWorkspace ? activeTabPath : null;

  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { startX: event.clientX, startWidth: width };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const next = dragRef.current.startWidth + event.clientX - dragRef.current.startX;
    setWidth(next);
  };
  const handlePointerUp = () => {
    dragRef.current = null;
  };

  return (
    <nav
      aria-label="Sidebar"
      inert={!open}
      // Escape that nothing inside handled (a menu, the tree's selection)
      // hides the sidebar.
      onKeyDown={(event) => {
        if (event.key !== "Escape" || event.defaultPrevented) return;
        event.preventDefault();
        setOpen(false);
      }}
      // Hidden, it slides out by its own width as the page slides back.
      style={{ width, left: open ? 0 : -width }}
      className="absolute inset-y-0 flex flex-col bg-surface paper-grain border-r border-edge-subtle font-sans transition-[left] duration-layout ease-layout motion-reduce:transition-none"
    >
      <SidebarHeader onNewNote={navigation.newNote} onHide={() => setOpen(false)} />

      {/* The scroll box: the Files tree virtualizes its rows against it (data-scroll-root).
          A right-click on it outside Pinned, a row or the Search field opens
          the Files root's New Note / New Folder menu, as on the tree's empty space. */}
      <div
        data-scroll-root
        onContextMenu={(event) => {
          if (event.defaultPrevented || !(event.target instanceof Element)) return;
          if (event.target.closest("[data-sidebar-pinned], input, textarea")) return;
          if (treeController.current?.openBackgroundMenu(event.clientX, event.clientY)) event.preventDefault();
        }}
        className="flex-1 min-h-0 overflow-y-auto scrollbar-none px-2 pt-1"
      >
        {hasVault && (
          <div data-sidebar-pinned>
            {/* usePinnedRows reads useSearchParams (a pinned tag's current row). */}
            <Suspense fallback={null}>
              <SidebarPinned activePath={currentPath} />
            </Suspense>
          </div>
        )}
        {hasVault && (
          <SidebarFiles
            treeController={treeController}
            activeFilePath={currentPath}
            openHandle={navigation.openHandle}
            allFiles={allFiles}
            folderPaths={folderPaths}
          />
        )}
      </div>

      {/* Resize handle on the trailing edge: a hairline lights up on hover
          and while dragging; arrow keys resize it too (Shift: larger steps). */}
      <div
        role="separator"
        tabIndex={0}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 32 : 8;
          const delta = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
          if (!delta) return;
          event.preventDefault();
          setWidth(width + delta);
        }}
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        aria-valuemin={SIDEBAR_MIN_WIDTH}
        aria-valuemax={SIDEBAR_MAX_WIDTH}
        aria-valuenow={width}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={() => setWidth(DEFAULT_WIDTH)}
        className="group absolute top-0 -right-1 bottom-0 w-2 cursor-col-resize z-10 outline-none"
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-fg-faint opacity-0 transition-opacity duration-150 delay-100 group-hover:opacity-60 group-active:opacity-100 group-focus-visible:opacity-100"
        />
      </div>
    </nav>
  );
}
