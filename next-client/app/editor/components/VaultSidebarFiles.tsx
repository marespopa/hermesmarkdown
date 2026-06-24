"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  HiOutlineDotsVertical,
  HiOutlineTrash,
  HiOutlinePencil,
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
  renameFile: (handle: FileSystemHandle) => void;
  deleteFile: (handle: FileSystemHandle) => void;
  onClose?: () => void;
  isSearchActive?: boolean;
  highlightQuery?: string;
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

interface FileRowProps {
  entry: any;
  entryPath?: string;
  isActive: boolean;
  entryId: string;
  highlightQuery: string;
  actionMenuOpen: { x: number; y: number; path: string } | null;
  setActionMenuOpen: (v: { x: number; y: number; path: string } | null) => void;
  openFile: (handle: FileSystemFileHandle, path?: string) => void;
  renameFile: (handle: FileSystemHandle) => void;
  deleteFile: (handle: FileSystemHandle) => void;
  onClose?: () => void;
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
  renameFile,
  deleteFile,
  onClose,
}: FileRowProps) {
  const folderPath =
    entryPath && entryPath !== entry.name
      ? entryPath.split("/").slice(0, -1).join("/")
      : null;

  return (
    <div className="group relative mx-1">
      <div
        onClick={() => {
          openFile(entry.handle as FileSystemFileHandle, entryPath);
          if (onClose && window.innerWidth < 1024) onClose();
        }}
        className={`flex items-center gap-2 px-4 py-2 cursor-pointer transition-all duration-200 text-ui-subhead pr-8 relative ${
          isActive
            ? "text-accent font-bold before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-accent"
            : "hover:bg-paper-softgray/60 dark:hover:bg-paper-dark-surface/50 text-ink-muted dark:text-stone font-medium"
        }`}
      >
        <div className="flex flex-col truncate leading-tight">
          <span className="truncate">
            <HighlightedName name={entry.name.replace(/\.md$/, "")} query={highlightQuery} />
          </span>
          {folderPath && (
            <span className="text-ui-caption opacity-40 truncate mt-0.5">
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
                renameFile(entry.handle);
                setActionMenuOpen(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-ui-footnote font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <HiOutlinePencil size={14} className="opacity-80" />
              Rename
            </Button>
            <Button
              variant="menu-item"
              onClick={(e) => {
                e.stopPropagation();
                deleteFile(entry.handle);
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

export default function VaultSidebarFiles({
  processedFiles,
  activeFilePath,
  openFile,
  renameFile,
  deleteFile,
  onClose,
  isSearchActive = false,
  highlightQuery = "",
}: VaultSidebarFilesProps) {
  const indexerState = useAtomValue(atom_indexerState);
  const isIndexing =
    indexerState === "compiling" ||
    (typeof indexerState === "object" && indexerState.status === "compiling");
  const [actionMenuOpen, setActionMenuOpen] = useState<{ x: number, y: number, path: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const shouldVirtualize = processedFiles.length > VIRTUALIZE_THRESHOLD;

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
      renameFile,
      deleteFile,
      onClose,
    };
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0">
      {/* File list — fills remaining height */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar min-h-0 pb-1 px-2"
      >
        {shouldVirtualize ? (
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
