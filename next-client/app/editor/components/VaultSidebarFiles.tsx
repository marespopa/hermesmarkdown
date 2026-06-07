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
}

export default function VaultSidebarFiles({
  onNewFile,
  processedFiles,
  activeFilePath,
  openFile,
  renameFile,
  deleteFile,
  onClose,
}: VaultSidebarFilesProps) {
  const indexerState = useAtomValue(atom_indexerState);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeFilePath) return;
    scrollToPath(activeFilePath);
  }, [activeFilePath]);

  function scrollToPath(path: string) {
    const container = scrollRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLElement>(`[data-path="${CSS.escape(path)}"]`);
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  const emptyStateMessage = "No files yet";
  const emptyStateHint = undefined;

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0">
      <div className="flex justify-between items-center px-4 py-2 shrink-0">
        <span className="text-ui-caption font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-600">
          Your Files
        </span>
        {onNewFile && (
          <Button
            variant="icon"
            className="w-6 h-6 opacity-60 hover:opacity-100 text-zinc-600 dark:text-zinc-400"
            onClick={onNewFile}
            title="Create New File"
          >
            <HiOutlinePlus size={14} />
          </Button>
        )}
      </div>

      {/* File list — fills remaining height */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar min-h-0 pb-1 px-2">
        {processedFiles.map((entry, idx) => {
          const entryPath = entry.path as string | undefined;
          const isActive = entryPath
            ? entryPath === activeFilePath
            : activeFilePath?.split("/").pop() === entry.name;
          const folderPath = entryPath && entryPath !== entry.name
            ? entryPath.split("/").slice(0, -1).join("/")
            : null;

          return (
            <div
              key={`file-${entryPath || entry.name}-${idx}`}
              data-path={entryPath || entry.name}
              className="group relative mx-1"
              onMouseLeave={() => setActionMenuOpen(null)}
            >
              <div
                onClick={() => {
                  openFile(entry.handle as FileSystemFileHandle, entryPath);
                  if (onClose && window.innerWidth < 1024) onClose();
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all text-ui-subhead pr-8 relative ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400 font-bold before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-500 bg-blue-500/10"
                    : "hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400 font-medium"
                }`}
              >
                <HiOutlineDocumentText size={16} className="shrink-0 opacity-60" />
                <div className="flex flex-col truncate leading-tight">
                  <span className="truncate">{entry.name.replace(/\.md$/, "")}</span>
                  {folderPath && (
                    <span className="text-ui-caption opacity-40 truncate mt-0.5">{folderPath}</span>
                  )}
                </div>
              </div>

              <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="icon"
                  className="w-7 h-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActionMenuOpen(actionMenuOpen === (entryPath || entry.name) ? null : (entryPath || entry.name));
                  }}
                >
                  <HiOutlineDotsVertical size={14} className="opacity-60" />
                </Button>
              </div>

              {actionMenuOpen === (entryPath || entry.name) && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setActionMenuOpen(null)} />
                  <div className="absolute right-2 top-[80%] z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl shadow-xl py-1 min-w-[120px] animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={(e) => { e.stopPropagation(); renameFile(entry.handle); setActionMenuOpen(null); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-ui-footnote font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <HiOutlinePencil size={14} className="opacity-60" />
                      Rename
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteFile(entry.handle); setActionMenuOpen(null); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-ui-footnote font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-red-500"
                    >
                      <HiOutlineTrash size={14} className="opacity-60" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {processedFiles.length === 0 && (
          <div className="px-4 py-8 flex flex-col items-center gap-2 text-center">
            {indexerState === "compiling" ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-zinc-300 dark:border-zinc-600 border-t-blue-500 dark:border-t-blue-400 animate-spin" />
                <p className="opacity-40 text-ui-caption italic">Scanning vault…</p>
              </>
            ) : (
              <>
                <p className="opacity-30 text-ui-footnote font-medium italic">{emptyStateMessage}</p>
                {emptyStateHint && <p className="opacity-20 text-ui-caption italic">{emptyStateHint}</p>}
              </>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
