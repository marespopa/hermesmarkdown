"use client";

import Button from "@/app/components/Button";
import { HiOutlineDocumentText, HiOutlineDotsVertical, HiOutlineDuplicate, HiOutlineFolder, HiOutlinePencil, HiOutlineTrash } from "react-icons/hi";
import { getEntryPath } from "./tree-model";

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

export interface TreeGutterInfo {
  ancestorLines: boolean[];
  isLast: boolean;
}

// Renders VSCode/`tree`-style indent guides: a vertical line per ancestor
// folder that still has siblings below it, plus this row's own branch
// connector (either a mid-height elbow for the last child, or a full-height
// tee for any other child).
export function TreeGutter({ ancestorLines, isLast }: TreeGutterInfo) {
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
  renameFile: (handle: FileSystemHandle, newName?: string) => void | Promise<void>;
  deleteFile: (handle: FileSystemHandle, path?: string) => void;
  duplicateFile?: (handle: FileSystemHandle) => void;
  onClose?: () => void;
  hideFolderPath?: boolean;
  treeGutter?: TreeGutterInfo;
  draggable?: boolean;
  onDragStartEntry?: () => void;
  onDragEndEntry?: () => void;
}

export function FileRow({
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
  onDragEndEntry,
}: FileRowProps) {
  const folderPath =
    !hideFolderPath && entryPath && entryPath !== entry.name
      ? entryPath.split("/").slice(0, -1).join("/")
      : null;

  return (
    <div className="group relative">
      <div
        draggable={draggable}
        onDragStart={(e) => {
          if (!draggable) return;
          onDragStartEntry?.();
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => onDragEndEntry?.()}
        onDoubleClick={(e) => {
          e.stopPropagation();
          openFile(entry.handle as FileSystemFileHandle, entryPath);
          if (onClose && window.innerWidth < 1024) onClose();
        }}
        tabIndex={-1}
        className={`mx-1 flex items-stretch transition-all duration-200 text-ui-subhead pr-8 ${
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
          aria-label="File options"
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
                openFile(entry.handle as FileSystemFileHandle, entryPath);
                if (onClose && window.innerWidth < 1024) onClose();
                setActionMenuOpen(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-ui-footnote font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <HiOutlineDocumentText size={14} className="opacity-80" />
              Open file
            </Button>
            {openFileInPane && (
              <Button
                variant="menu-item"
                onClick={(e) => {
                  e.stopPropagation();
                  openFileInPane(entry.handle as FileSystemFileHandle, getEntryPath(entry));
                  setActionMenuOpen(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-ui-footnote font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <HiOutlineFolder size={14} className="opacity-80" />
                Open in pane
              </Button>
            )}
            <Button
              variant="menu-item"
              onClick={(e) => {
                e.stopPropagation();
                setActionMenuOpen(null);
                void renameFile(entry.handle);
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
