"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  HiOutlineDotsVertical,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineDuplicate,
  HiOutlineFolder,
  HiOutlineChevronRight,
  HiOutlineChevronDown,
} from "react-icons/hi";
import { useAtomValue } from "jotai";
import { useVirtualizer } from "@tanstack/react-virtual";
import { atom_indexerState } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";

// Below this count, plain rendering is simpler and avoids virtualizer
// scroll-restoration quirks (e.g. jumping while resizing); above it, an
// un-virtualized list of vault-scale (or larger) file counts would mean
// one DOM node per file, which is the actual performance cliff.
const VIRTUALIZE_THRESHOLD = 200;

interface VaultSidebarFilesProps {
  processedFiles: any[];
  activeFilePath: string | null;
  openFile: (handle: FileSystemFileHandle, path?: string) => void;
  openFileInPane?: (handle: FileSystemFileHandle, path?: string) => void;
  renameFile: (handle: FileSystemHandle) => void;
  deleteFile: (handle: FileSystemHandle, path?: string) => void;
  duplicateFile?: (handle: FileSystemHandle) => void;
  onClose?: () => void;
  isSearchActive?: boolean;
  highlightQuery?: string;
  treeView?: boolean;
  // Tree-only: folders are inferred from paths, so folder actions need a way
  // to resolve a real FileSystemDirectoryHandle.
  resolveFolderHandle?: (path: string) => Promise<any | null>;
  createNewFile?: (dirHandle?: any) => void;
  moveItem?: (handle: any, targetDir: any) => void;
}

interface DraggedEntry {
  kind: "file" | "folder";
  path: string;
  name: string;
  handle?: any;
}

interface TreeFolderNode {
  type: "folder";
  name: string;
  path: string;
  children: TreeNode[];
}

interface TreeFileNode {
  type: "file";
  name: string;
  path: string;
  entry: any;
}

type TreeNode = TreeFolderNode | TreeFileNode;

function buildFileTree(files: any[]): TreeNode[] {
  const root: TreeFolderNode = { type: "folder", name: "", path: "", children: [] };
  const folderByPath = new Map<string, TreeFolderNode>([["", root]]);

  for (const entry of files) {
    const path: string = getEntryPath(entry) || entry.name;
    const segments = path.split("/");
    const fileName = segments.pop()!;

    let parentPath = "";
    let parent = root;
    for (const segment of segments) {
      const folderPath = parentPath ? `${parentPath}/${segment}` : segment;
      let folder = folderByPath.get(folderPath);
      if (!folder) {
        folder = { type: "folder", name: segment, path: folderPath, children: [] };
        folderByPath.set(folderPath, folder);
        parent.children.push(folder);
      }
      parent = folder;
      parentPath = folderPath;
    }

    parent.children.push({ type: "file", name: fileName, path, entry });
  }

  const sortChildren = (node: TreeFolderNode) => {
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const child of node.children) {
      if (child.type === "folder") sortChildren(child);
    }
  };
  sortChildren(root);

  return root.children;
}

function HighlightedName({ name, query }: { name: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{name}</>;
  const idx = name.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{name}</>;
  return (
    <>
      {name.slice(0, idx)}
      <mark className="bg-transparent text-accent">{name.slice(idx, idx + q.length)}</mark>
      {name.slice(idx + q.length)}
    </>
  );
}

interface TreeGutterInfo {
  ancestorLines: boolean[];
  isLast: boolean;
}

// Renders VSCode/`tree`-style indent guides: a vertical line per ancestor
// folder that still has siblings below it, plus this row's own branch
// connector (either a mid-height elbow for the last child, or a full-height
// tee for any other child).
function TreeGutter({ ancestorLines, isLast }: TreeGutterInfo) {
  return (
    <div className="flex items-stretch shrink-0">
      {ancestorLines.map((hasLine, i) => (
        <span key={i} className="relative w-5 shrink-0">
          {hasLine && (
            <span className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-edge-subtle" />
          )}
        </span>
      ))}
      <span className="relative w-5 shrink-0">
        <span
          className="absolute left-1/2 -translate-x-1/2 w-px bg-edge-subtle"
          style={{ top: 0, bottom: isLast ? "50%" : 0 }}
        />
        <span className="absolute top-1/2 left-1/2 right-1.5 h-px -translate-y-1/2 bg-edge-subtle" />
      </span>
    </div>
  );
}

interface FileRowProps {
  entry: any;
  entryPath?: string;
  isActive: boolean;
  entryId: string;
  highlightQuery: string;
  actionMenuOpen: { x: number; y: number; path: string } | null;
  setActionMenuOpen: (v: { x: number; y: number; path: string } | null) => void;
  openFile: (handle: FileSystemFileHandle, path?: string) => void;
  openFileInPane?: (handle: FileSystemFileHandle, path?: string) => void;
  renameFile: (handle: FileSystemHandle) => void;
  deleteFile: (handle: FileSystemHandle, path?: string) => void;
  duplicateFile?: (handle: FileSystemHandle) => void;
  onClose?: () => void;
  hideFolderPath?: boolean;
  treeGutter?: TreeGutterInfo;
  draggable?: boolean;
  onDragStartEntry?: () => void;
}

function FileRow({
  entry,
  entryPath,
  isActive,
  entryId,
  highlightQuery,
  actionMenuOpen,
  setActionMenuOpen,
  openFile,
  openFileInPane,
  renameFile,
  deleteFile,
  duplicateFile,
  onClose,
  hideFolderPath = false,
  treeGutter,
  draggable = false,
  onDragStartEntry,
}: FileRowProps) {
  const folderPath =
    !hideFolderPath && entryPath && entryPath !== entry.name
      ? entryPath.split("/").slice(0, -1).join("/")
      : null;

  return (
    <div className="group relative mx-1">
      <div
        onClick={() => {
          openFile(entry.handle as FileSystemFileHandle, entryPath);
          if (onClose && window.innerWidth < 1024) onClose();
        }}
        draggable={draggable}
        onDragStart={(e) => {
          if (!draggable) return;
          onDragStartEntry?.();
          e.dataTransfer.effectAllowed = "move";
        }}
        className={`flex items-stretch cursor-pointer transition-all duration-200 text-ui-subhead pr-8 ${
          isActive ? "text-accent" : "text-ink-muted dark:text-stone font-medium"
        }`}
      >
        {treeGutter && <TreeGutter {...treeGutter} />}
        <div
          className={`flex flex-col truncate leading-tight pl-2 pr-4 py-2 min-w-0 flex-1 ${
            isActive ? "" : "hover:bg-paper-softgray/60 dark:hover:bg-paper-dark-surface/50"
          }`}
        >
          <span
            title={entry.name.replace(/\.md$/, "")}
            className={`truncate w-fit max-w-full ${
              isActive ? "font-semibold bg-accent/15 rounded px-1 -mx-1" : ""
            }`}
          >
            <HighlightedName name={entry.name.replace(/\.md$/, "")} query={highlightQuery} />
          </span>
          {folderPath && (
            <span title={folderPath} className="text-ui-caption opacity-40 truncate mt-0.5">
              {folderPath}
            </span>
          )}
        </div>
      </div>

      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity z-10">
        <Button
          variant="icon"
          className="w-7 h-7"
          onClick={(e) => {
            e.stopPropagation();
            if (actionMenuOpen?.path === entryId) {
              setActionMenuOpen(null);
            } else {
              const rect = e.currentTarget.getBoundingClientRect();
              setActionMenuOpen({
                x: rect.right,
                y: rect.bottom > window.innerHeight - 120 ? rect.top - 100 : rect.bottom + 4,
                path: entryId,
              });
            }
          }}
        >
          <HiOutlineDotsVertical size={14} className="opacity-80" />
        </Button>
      </div>

      {actionMenuOpen && actionMenuOpen.path === entryId && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => { e.stopPropagation(); setActionMenuOpen(null); }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed z-50 bg-paper-light dark:bg-paper-dark backdrop-blur-xl border border-edge-subtle rounded-xl py-1 min-w-[120px] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 ease-out"
            style={{ top: actionMenuOpen.y, left: actionMenuOpen.x - 120 }}
          >
            <Button
              variant="menu-item"
              onClick={(e) => {
                e.stopPropagation();
                openFileInPane?.(entry.handle as FileSystemFileHandle, getEntryPath(entry));
                setActionMenuOpen(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-ui-footnote font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <HiOutlineFolder size={14} className="opacity-80" />
              Open in pane
            </Button>
            <Button
              variant="menu-item"
              onClick={(e) => {
                e.stopPropagation();
                renameFile(entry.handle);
                setActionMenuOpen(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-ui-footnote font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <HiOutlinePencil size={14} className="opacity-80" />
              Rename
            </Button>
            {duplicateFile && (
              <Button
                variant="menu-item"
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateFile(entry.handle);
                  setActionMenuOpen(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-ui-footnote font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <HiOutlineDuplicate size={14} className="opacity-80" />
                Duplicate
              </Button>
            )}
            <Button
              variant="menu-item"
              onClick={(e) => {
                e.stopPropagation();
                deleteFile(entry.handle, getEntryPath(entry));
                setActionMenuOpen(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-ui-footnote font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-red-500"
            >
              <HiOutlineTrash size={14} className="opacity-80" />
              Delete
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function getEntryPath(entry: any): string | undefined {
  return entry.path as string | undefined;
}

function getEntryId(entry: any): string {
  return getEntryPath(entry) || entry.name;
}

function isDescendantOrSelf(ancestorPath: string, path: string): boolean {
  return path === ancestorPath || path.startsWith(`${ancestorPath}/`);
}

interface FolderRowProps {
  node: TreeFolderNode;
  treeGutter?: TreeGutterInfo;
  isCollapsed: boolean;
  // True when this folder is an ancestor of the currently active file —
  // gives the whole chain leading to the open file a subtle tint so it
  // reads as "this file lives here" at a glance.
  isActiveChain?: boolean;
  onToggle: (path: string) => void;
  actionMenuOpen: { x: number; y: number; path: string } | null;
  setActionMenuOpen: (v: { x: number; y: number; path: string } | null) => void;
  draggedEntry: DraggedEntry | null;
  setDraggedEntry: (v: DraggedEntry | null) => void;
  onDropInto: (targetPath: string) => void;
  resolveFolderHandle?: (path: string) => Promise<any | null>;
  createNewFile?: (dirHandle?: any) => void;
  renameFile: (handle: any) => void;
  deleteFile: (handle: any, path?: string) => void;
}

function FolderRow({
  node,
  treeGutter,
  isCollapsed,
  isActiveChain = false,
  onToggle,
  actionMenuOpen,
  setActionMenuOpen,
  draggedEntry,
  setDraggedEntry,
  onDropInto,
  resolveFolderHandle,
  createNewFile,
  renameFile,
  deleteFile,
}: FolderRowProps) {
  const [dragOver, setDragOver] = useState(false);
  const entryId = `folder:${node.path}`;
  const menuOpen = actionMenuOpen?.path === entryId;

  const canAcceptDrop =
    !!draggedEntry &&
    !(draggedEntry.kind === "folder" && isDescendantOrSelf(draggedEntry.path, node.path)) &&
    draggedEntry.path.split("/").slice(0, -1).join("/") !== node.path;

  return (
    <div className={`group relative ${menuOpen ? "z-20" : ""}`}>
      <div
        onClick={() => onToggle(node.path)}
        draggable
        onDragStart={(e) => {
          setDraggedEntry({ kind: "folder", path: node.path, name: node.name });
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (canAcceptDrop) {
            setDragOver(true);
            e.dataTransfer.dropEffect = "move";
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (canAcceptDrop) onDropInto(node.path);
          setDraggedEntry(null);
        }}
        className={`flex items-stretch mx-1 pr-8 cursor-pointer text-ui-subhead transition-colors relative ${
          dragOver
            ? "ring-2 ring-sage/50 bg-sage/10 text-sage dark:text-sage font-medium"
            : isActiveChain
              ? "text-ink-light dark:text-ink-dark font-medium hover:bg-paper-softgray/60 dark:hover:bg-paper-dark-surface/50"
              : "text-ink-muted dark:text-stone font-medium hover:bg-paper-softgray/60 dark:hover:bg-paper-dark-surface/50"
        }`}
      >
        {treeGutter && <TreeGutter {...treeGutter} />}
        <div className="flex items-center gap-1 pl-2 pr-4 py-2 min-w-0 flex-1">
          <span className="w-3 flex items-center justify-center opacity-40 shrink-0">
            {isCollapsed ? <HiOutlineChevronRight size={13} /> : <HiOutlineChevronDown size={13} />}
          </span>
          <HiOutlineFolder size={16} className="shrink-0 opacity-70" />
          <span title={node.name} className="truncate">{node.name}</span>
        </div>
      </div>

      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity z-10">
        <Button
          variant="icon"
          className="w-7 h-7"
          onClick={(e) => {
            e.stopPropagation();
            if (menuOpen) {
              setActionMenuOpen(null);
            } else {
              const rect = e.currentTarget.getBoundingClientRect();
              setActionMenuOpen({
                x: rect.right,
                y: rect.bottom > window.innerHeight - 170 ? rect.top - 150 : rect.bottom + 4,
                path: entryId,
              });
            }
          }}
        >
          <HiOutlineDotsVertical size={14} className="opacity-80" />
        </Button>
      </div>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => { e.stopPropagation(); setActionMenuOpen(null); }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed z-50 bg-paper-light dark:bg-paper-dark backdrop-blur-xl border border-edge-subtle rounded-xl py-1 min-w-[140px] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 ease-out"
            style={{ top: actionMenuOpen!.y, left: actionMenuOpen!.x - 140 }}
          >
            {createNewFile && (
              <Button
                variant="menu-item"
                onClick={async (e) => {
                  e.stopPropagation();
                  setActionMenuOpen(null);
                  const handle = await resolveFolderHandle?.(node.path);
                  if (handle) createNewFile(handle);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-ui-footnote font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                New File
              </Button>
            )}
            <Button
              variant="menu-item"
              onClick={async (e) => {
                e.stopPropagation();
                setActionMenuOpen(null);
                const handle = await resolveFolderHandle?.(node.path);
                if (handle) renameFile(handle);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-ui-footnote font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <HiOutlinePencil size={14} className="opacity-80" />
              Rename
            </Button>
            <Button
              variant="menu-item"
              onClick={async (e) => {
                e.stopPropagation();
                setActionMenuOpen(null);
                const handle = await resolveFolderHandle?.(node.path);
                if (handle) deleteFile(handle, node.path);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-ui-footnote font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-red-500"
            >
              <HiOutlineTrash size={14} className="opacity-80" />
              Delete
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function TreeNodes({
  nodes,
  level,
  ancestorLines,
  isFolderCollapsed,
  isActiveAncestor,
  onToggleFolder,
  rowProps,
  draggedEntry,
  setDraggedEntry,
  onDropInto,
  folderRowExtras,
}: {
  nodes: TreeNode[];
  level: number;
  // Continuation flags for each ancestor column above this row's own branch
  // (true = that ancestor still has siblings below it, so its line continues).
  // The root call passes [] — level 0 renders flush, with no gutter at all.
  ancestorLines: boolean[];
  isFolderCollapsed: (path: string) => boolean;
  isActiveAncestor: (path: string) => boolean;
  onToggleFolder: (path: string) => void;
  rowProps: (entry: any) => any;
  draggedEntry: DraggedEntry | null;
  setDraggedEntry: (v: DraggedEntry | null) => void;
  onDropInto: (targetPath: string) => void;
  folderRowExtras: Omit<FolderRowProps, "node" | "treeGutter" | "isCollapsed" | "isActiveChain" | "onToggle" | "draggedEntry" | "setDraggedEntry" | "onDropInto">;
}) {
  return (
    <>
      {nodes.map((node, index) => {
        const isLast = index === nodes.length - 1;
        const treeGutter = level > 0 ? { ancestorLines, isLast } : undefined;

        if (node.type === "folder") {
          const isCollapsed = isFolderCollapsed(node.path);
          const childAncestorLines = level === 0 ? [] : [...ancestorLines, !isLast];
          return (
            <div key={`folder-${node.path}`} data-path={node.path}>
              <FolderRow
                node={node}
                treeGutter={treeGutter}
                isCollapsed={isCollapsed}
                isActiveChain={isActiveAncestor(node.path)}
                onToggle={onToggleFolder}
                draggedEntry={draggedEntry}
                setDraggedEntry={setDraggedEntry}
                onDropInto={onDropInto}
                {...folderRowExtras}
              />
              {!isCollapsed && (
                <TreeNodes
                  nodes={node.children}
                  level={level + 1}
                  ancestorLines={childAncestorLines}
                  isFolderCollapsed={isFolderCollapsed}
                  isActiveAncestor={isActiveAncestor}
                  onToggleFolder={onToggleFolder}
                  rowProps={rowProps}
                  draggedEntry={draggedEntry}
                  setDraggedEntry={setDraggedEntry}
                  onDropInto={onDropInto}
                  folderRowExtras={folderRowExtras}
                />
              )}
            </div>
          );
        }

        return (
          <div key={`file-${node.path}`} data-path={node.path}>
            <FileRow
              {...rowProps(node.entry)}
              hideFolderPath
              treeGutter={treeGutter}
              draggable
              onDragStartEntry={() =>
                setDraggedEntry({ kind: "file", path: node.path, name: node.name, handle: node.entry.handle })
              }
            />
          </div>
        );
      })}
    </>
  );
}

export default function VaultSidebarFiles({
  processedFiles,
  activeFilePath,
  openFile,
  openFileInPane,
  renameFile,
  deleteFile,
  duplicateFile,
  onClose,
  isSearchActive = false,
  highlightQuery = "",
  treeView = false,
  resolveFolderHandle,
  createNewFile,
  moveItem,
}: VaultSidebarFilesProps) {
  const indexerState = useAtomValue(atom_indexerState);
  const isIndexing =
    indexerState === "compiling" ||
    (typeof indexerState === "object" && indexerState.status === "compiling");
  const [actionMenuOpen, setActionMenuOpen] = useState<{ x: number, y: number, path: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Folders are collapsed by default; the only automatic exception is the
  // chain of ancestor folders leading to the active file. Manual toggles
  // (in either direction) override that default until the user toggles again.
  const [manuallyExpanded, setManuallyExpanded] = useState<Set<string>>(() => new Set());
  const [manuallyCollapsed, setManuallyCollapsed] = useState<Set<string>>(() => new Set());
  const [draggedEntry, setDraggedEntry] = useState<DraggedEntry | null>(null);
  const [rootDragOver, setRootDragOver] = useState(false);

  const tree = useMemo(() => (treeView ? buildFileTree(processedFiles) : []), [treeView, processedFiles]);

  const activeAncestorPaths = useMemo(() => {
    const ancestors = new Set<string>();
    if (!activeFilePath) return ancestors;
    const segments = activeFilePath.split("/");
    segments.pop();
    let acc = "";
    for (const segment of segments) {
      acc = acc ? `${acc}/${segment}` : segment;
      ancestors.add(acc);
    }
    return ancestors;
  }, [activeFilePath]);

  const isFolderCollapsed = (path: string) => {
    if (manuallyExpanded.has(path)) return false;
    if (manuallyCollapsed.has(path)) return true;
    return !activeAncestorPaths.has(path);
  };

  const toggleFolder = (path: string) => {
    if (isFolderCollapsed(path)) {
      setManuallyExpanded((prev) => new Set(prev).add(path));
      setManuallyCollapsed((prev) => { const next = new Set(prev); next.delete(path); return next; });
    } else {
      setManuallyCollapsed((prev) => new Set(prev).add(path));
      setManuallyExpanded((prev) => { const next = new Set(prev); next.delete(path); return next; });
    }
  };

  const handleDropInto = async (targetPath: string) => {
    if (!draggedEntry || !moveItem || !resolveFolderHandle) return;
    const targetHandle = await resolveFolderHandle(targetPath);
    const sourceHandle = draggedEntry.kind === "file"
      ? draggedEntry.handle
      : await resolveFolderHandle(draggedEntry.path);
    if (targetHandle && sourceHandle) moveItem(sourceHandle, targetHandle);
  };

  const canDropAtRoot =
    !!draggedEntry && draggedEntry.path.split("/").slice(0, -1).join("/") !== "";

  const shouldVirtualize = !treeView && processedFiles.length > VIRTUALIZE_THRESHOLD;

  // Rows are variable height (a second "folder path" line shows up for
  // nested files), so each row self-reports its real height via
  // `measureElement` rather than relying on a fixed estimate.
  const rowVirtualizer = useVirtualizer({
    count: processedFiles.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 44,
    overscan: 12,
  });

  useEffect(() => {
    if (!activeFilePath) return;
    const index = processedFiles.findIndex((entry) => {
      const entryPath = getEntryPath(entry);
      return entryPath ? entryPath === activeFilePath : activeFilePath.split("/").pop() === entry.name;
    });
    if (index === -1) return;

    if (shouldVirtualize) {
      rowVirtualizer.scrollToIndex(index, { align: "auto" });
    } else {
      scrollToPath(activeFilePath);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilePath, shouldVirtualize, processedFiles]);

  function scrollToPath(path: string) {
    const container = scrollRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLElement>(
      `[data-path="${CSS.escape(path)}"]`,
    );
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  const emptyStateMessage = isSearchActive ? "No file found" : "No files yet";
  const emptyStateHint = undefined;

  const rowProps = (entry: any) => {
    const entryPath = getEntryPath(entry);
    const isActive = entryPath
      ? entryPath === activeFilePath
      : activeFilePath?.split("/").pop() === entry.name;
    return {
      entry,
      entryPath,
      isActive,
      entryId: getEntryId(entry),
      highlightQuery,
      actionMenuOpen,
      setActionMenuOpen,
      openFile,
      openFileInPane,
      renameFile,
      deleteFile,
      duplicateFile,
      onClose,
    };
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0">
      {/* File list — fills remaining height */}
      <div
        ref={scrollRef}
        onDragOver={(e) => {
          if (!treeView || !canDropAtRoot) return;
          e.preventDefault();
          setRootDragOver(true);
          e.dataTransfer.dropEffect = "move";
        }}
        onDragLeave={() => setRootDragOver(false)}
        onDrop={(e) => {
          if (!treeView) return;
          e.preventDefault();
          setRootDragOver(false);
          if (canDropAtRoot) handleDropInto("");
          setDraggedEntry(null);
        }}
        className={`flex-1 overflow-y-auto custom-scrollbar min-h-0 pb-1 px-2 ${
          rootDragOver ? "bg-sage/5" : ""
        }`}
      >
        {treeView ? (
          <TreeNodes
            nodes={tree}
            level={0}
            ancestorLines={[]}
            isFolderCollapsed={isFolderCollapsed}
            isActiveAncestor={(path) => activeAncestorPaths.has(path)}
            onToggleFolder={toggleFolder}
            rowProps={rowProps}
            draggedEntry={draggedEntry}
            setDraggedEntry={setDraggedEntry}
            onDropInto={handleDropInto}
            folderRowExtras={{
              actionMenuOpen,
              setActionMenuOpen,
              resolveFolderHandle,
              createNewFile,
              renameFile,
              deleteFile,
            }}
          />
        ) : shouldVirtualize ? (
          <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative", width: "100%" }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const entry = processedFiles[virtualRow.index];
              const entryPath = getEntryPath(entry);
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  data-path={entryPath || entry.name}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <FileRow {...rowProps(entry)} />
                </div>
              );
            })}
          </div>
        ) : (
          processedFiles.map((entry, idx) => {
            const entryPath = getEntryPath(entry);
            return (
              <div key={`file-${entryPath || entry.name}-${idx}`} data-path={entryPath || entry.name}>
                <FileRow {...rowProps(entry)} />
              </div>
            );
          })
        )}

        {processedFiles.length === 0 && (
          <div className="px-4 py-8 flex flex-col items-center gap-2 text-center">
            {isIndexing ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-edge border-t-sage dark:border-t-sage animate-spin" />
                <p className="opacity-40 text-ui-caption italic">
                  Scanning vault…
                </p>
              </>
            ) : (
              <>
                <p className="opacity-30 text-ui-footnote font-medium italic">
                  {emptyStateMessage}
                </p>
                {emptyStateHint && (
                  <p className="opacity-20 text-ui-caption italic">
                    {emptyStateHint}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {isIndexing && processedFiles.length > 0 && (
          <div className="flex items-center justify-center gap-2 py-2">
            <div className="w-3 h-3 rounded-full border-2 border-edge border-t-sage dark:border-t-sage animate-spin" />
            <p className="opacity-40 text-ui-caption italic">Still scanning vault…</p>
          </div>
        )}
      </div>
    </div>
  );
}
