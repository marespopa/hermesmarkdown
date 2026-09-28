"use client";

import { atom_indexerState } from "@/app/atoms/ui-atoms";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAtomValue } from "jotai";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileRow } from "./vault-tree/FileRow";
import { buildFileTree, type DraggedEntry, getEntryId, getEntryPath, type VaultFileTreeProps, VIRTUALIZE_THRESHOLD } from "./vault-tree/tree-model";
import { TreeNodes } from "./vault-tree/TreeNodes";

export default function VaultFileTree({
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
  folderPaths = [],
  resolveFolderHandle,
  createNewFile,
  createFolder,
  moveItem,
}: VaultFileTreeProps) {
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

  const tree = useMemo(
    () => (treeView ? buildFileTree(processedFiles, folderPaths) : []),
    [treeView, processedFiles, folderPaths],
  );

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
        data-file-tree={treeView || undefined}
        tabIndex={treeView ? -1 : undefined}
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
              createFolder,
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
