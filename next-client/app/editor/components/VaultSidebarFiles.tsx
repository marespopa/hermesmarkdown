"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  HiOutlineDocumentText,
  HiOutlineDotsVertical,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlinePlus,
} from "react-icons/hi";
import { useAtomValue } from "jotai";
import { atom_indexerState } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";

interface VaultSidebarFilesProps {
  onNewFile?: () => void;
  processedFiles: any[];
  activeFilePath: string | null;
  openFile: (handle: FileSystemFileHandle, path?: string) => void;
  renameFile: (handle: FileSystemHandle) => void;
  deleteFile: (handle: FileSystemHandle) => void;
  onClose?: () => void;
  isSearchActive?: boolean;
}

export default function VaultSidebarFiles({
  onNewFile,
  processedFiles,
  activeFilePath,
  openFile,
  renameFile,
  deleteFile,
  onClose,
  isSearchActive = false,
}: VaultSidebarFilesProps) {
  const indexerState = useAtomValue(atom_indexerState);
  const isIndexing =
    indexerState === "compiling" ||
    (typeof indexerState === "object" && indexerState.status === "compiling");
  const [actionMenuOpen, setActionMenuOpen] = useState<{ x: number, y: number, path: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeFilePath) return;
    scrollToPath(activeFilePath);
  }, [activeFilePath]);

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

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0">
      <div className="flex justify-between items-center px-4 py-2 shrink-0">
        <span className="text-ui-caption font-semibold uppercase tracking-wider text-stone dark:text-fg-faint">
          Your Files
        </span>
        {onNewFile && (
          <Button
            variant="icon"
            className="w-6 h-6 opacity-80 hover:opacity-100 text-ink-muted dark:text-stone"
            onClick={onNewFile}
            title="Create New File"
          >
            <HiOutlinePlus size={14} />
          </Button>
        )}
      </div>

      {/* File list — fills remaining height */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar min-h-0 pb-1 px-2"
      >
        {processedFiles.map((entry, idx) => {
          const entryPath = entry.path as string | undefined;
          const isActive = entryPath
            ? entryPath === activeFilePath
            : activeFilePath?.split("/").pop() === entry.name;
          const folderPath =
            entryPath && entryPath !== entry.name
              ? entryPath.split("/").slice(0, -1).join("/")
              : null;
          const entryId = entryPath || entry.name;

          return (
            <div
              key={`file-${entryPath || entry.name}-${idx}`}
              data-path={entryPath || entry.name}
              className="group relative mx-1"
            >
              <div
                onClick={() => {
                  openFile(entry.handle as FileSystemFileHandle, entryPath);
                  if (onClose && window.innerWidth < 1024) onClose();
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all duration-200 text-ui-subhead pr-8 relative ${
                  isActive
                    ? "text-sage dark:text-sage font-bold before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-sage bg-sage/10 shadow-sm shadow-sage/5"
                    : "hover:bg-paper-softgray/60 dark:hover:bg-paper-dark-surface/50 text-ink-muted dark:text-stone font-medium"
                }`}
              >
                <HiOutlineDocumentText
                  size={16}
                  className="shrink-0 opacity-80"
                />
                <div className="flex flex-col truncate leading-tight">
                  <span className="truncate">
                    {entry.name.replace(/\.md$/, "")}
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
                        path: entryId
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
                    className="fixed z-50 bg-paper-light dark:bg-paper-dark backdrop-blur-xl border border-edge-subtle rounded-xl shadow-2xl py-1 min-w-[120px] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 ease-out"
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
        })}

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
      </div>
    </div>
  );
}
