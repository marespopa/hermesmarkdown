"use client";

import { atom_indexerState } from "@/app/atoms/ui-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileRow } from "./vault-tree/FileRow";
import { ListHeader } from "./vault-tree/list-columns";
import { buildFileTree, canDropInto, type DraggedEntry, flattenVisible, getEntryPath, type TreeFolderNode, type VaultFileTreeProps, VIRTUALIZE_THRESHOLD } from "./vault-tree/tree-model";
import { TreeContextMenu } from "./vault-tree/TreeContextMenu";
import { handleTreeKey } from "./vault-tree/tree-keyboard";
import { treeMenuItems } from "./vault-tree/tree-menu-items";
import { TreeNodes } from "./vault-tree/TreeNodes";
import { useFolderExpansion } from "./vault-tree/use-folder-expansion";
import { useTouchTreeDrag } from "./vault-tree/use-touch-tree-drag";
import { useTreeActions } from "./vault-tree/use-tree-actions";
import { useTreeSelection } from "./vault-tree/use-tree-selection";

export default function VaultFileTree(props: VaultFileTreeProps) {
  const {
    processedFiles,
    activeFilePath,
    openFile,
    onClose,
    singleClickOpen = false,
    isSearchActive = false,
    highlightQuery = "",
    treeView = false,
    columns = false,
    folderPaths = [],
    undoFileOperation,
    controllerRef,
  } = props;
  const indexerState = useAtomValue(atom_indexerState);
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const showColumns = treeView && columns;
  const isIndexing =
    indexerState === "compiling" ||
    (typeof indexerState === "object" && indexerState.status === "compiling");
  const scrollRef = useRef<HTMLDivElement>(null);
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

  const { isFolderCollapsed, toggleFolder, expandFolder } = useFolderExpansion(activeAncestorPaths);

  const rows = useMemo(() => flattenVisible(tree, isFolderCollapsed), [tree, isFolderCollapsed]);
  const selection = useTreeSelection(rows);
  const [treeFocused, setTreeFocused] = useState(false);

  // Opening a file (from the palette, a link, a tab) selects its row, as in
  // a code editor's explorer. Once per change of active file, after its
  // folders have opened, so clicks and multi-selects made since stand.
  const selectedActiveRef = useRef<string | null>(null);
  const { selectOnly } = selection;
  useEffect(() => {
    if (!treeView || !activeFilePath) {
      selectedActiveRef.current = null;
      return;
    }
    if (selectedActiveRef.current === activeFilePath) return;
    if (!rows.some((row) => row.path === activeFilePath)) return;
    selectedActiveRef.current = activeFilePath;
    selectOnly(activeFilePath);
  }, [treeView, activeFilePath, rows, selectOnly]);

  // Whether the row was found (a row inside a collapsed folder isn't rendered).
  const scrollToPath = useCallback((path: string): boolean => {
    const container = scrollRef.current;
    if (!container) return false;
    const el = container.querySelector<HTMLElement>(
      `[data-path="${CSS.escape(path)}"]`,
    );
    if (!el) return false;
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    return true;
  }, []);

  const actions = useTreeActions({
    props,
    rows,
    selection,
    isFolderCollapsed,
    toggleFolder,
    expandFolder,
    draggedEntry,
    setDraggedEntry,
    focusTree: () => scrollRef.current?.focus({ preventScroll: true }),
    scrollToPath,
  });

  useEffect(() => {
    if (!controllerRef) return;
    controllerRef.current = { startCreate: actions.startCreate };
    return () => { controllerRef.current = null; };
  }, [controllerRef, actions.startCreate]);

  const canDropAtRoot = canDropInto(draggedEntry, "");

  const { startTouchDrag, touchDropTarget, touchGhost, isTouchPressing } = useTouchTreeDrag({
    scrollRef,
    setDraggedEntry,
    onDropInto: (targetPath, entry) => void actions.dropInto(targetPath, entry),
    expandFolder,
  });

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

  // Reveal the active file once per change of active file. The list itself
  // changes constantly in a large vault (scanning, indexing, the file
  // watcher); re-revealing on each of those yanked the user's scroll back
  // to the active file. A file not listed yet (still scanning) is revealed
  // when it first appears.
  const revealedPathRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeFilePath) {
      revealedPathRef.current = null;
      return;
    }
    if (revealedPathRef.current === activeFilePath) return;
    const index = processedFiles.findIndex((entry) => {
      const entryPath = getEntryPath(entry);
      return entryPath ? entryPath === activeFilePath : activeFilePath.split("/").pop() === entry.name;
    });
    if (index === -1) return;

    if (shouldVirtualize) {
      rowVirtualizer.scrollToIndex(index, { align: "auto" });
      revealedPathRef.current = activeFilePath;
    } else if (scrollToPath(activeFilePath)) {
      revealedPathRef.current = activeFilePath;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilePath, shouldVirtualize, processedFiles]);

  const emptyStateMessage = isSearchActive ? "No file found" : "No files yet";
  const emptyStateHint = undefined;

  const rowProps = (entry: any) => {
    const entryPath = getEntryPath(entry);
    const path = entryPath || entry.name;
    const isActive = entryPath
      ? entryPath === activeFilePath
      : activeFilePath?.split("/").pop() === entry.name;
    return {
      entry,
      entryPath,
      isActive,
      showColumns,
      modifiedAt: entryPath ? fileMetadata?.[entryPath]?.modifiedAt : undefined,
      highlightQuery,
      openFile,
      onClose,
      singleClickOpen,
      onOpenMenu: (x: number, y: number) => actions.openMenu({ type: "row", kind: "file", path }, x, y),
      ...(treeView
        ? {
            isSelected: selection.selected.has(path),
            isFocused: selection.focusPath === path,
            treeFocused,
            onSelectClick: (mods: Parameters<typeof selection.click>[1]) => selection.click(path, mods),
            editing: actions.renameEditing(path),
          }
        : {}),
    };
  };

  const folderProps = (node: TreeFolderNode) => ({
    showColumns,
    draggedEntry,
    setDraggedEntry,
    onDragStartFolder: () => actions.startDrag({ kind: "folder", path: node.path, name: node.name }),
    onDropInto: (targetPath: string) => void actions.dropInto(targetPath),
    onOpenMenu: (x: number, y: number) => actions.openMenu({ type: "row", kind: "folder", path: node.path }, x, y),
    isSelected: selection.selected.has(node.path),
    isFocused: selection.focusPath === node.path,
    treeFocused,
    onSelectClick: (mods: Parameters<typeof selection.click>[1]) => selection.click(node.path, mods),
    editing: actions.renameEditing(node.path),
  });

  const onTreeKeyDown = (e: React.KeyboardEvent) => {
    if (!treeView || actions.renamingPath || actions.pendingCreate || actions.menu) return;
    // Keys on a row's ⋯ button stay the button's.
    const target = e.target as HTMLElement;
    if (target !== e.currentTarget && target.getAttribute("role") !== "treeitem") return;
    const result = handleTreeKey(e, {
      rows,
      selection,
      isFolderCollapsed,
      toggleFolder,
      openRow: actions.openRow,
      startRename: actions.startRename,
      trashSelection: actions.trashSelection,
      undo: undoFileOperation ? () => void undoFileOperation() : undefined,
    });
    if (result === undefined) return;
    e.preventDefault();
    // Not also the app's own shortcuts (⌘O, ⌘Z…) on the window.
    e.stopPropagation();
    if (result) scrollToPath(result);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0">
      {/* File list — fills remaining height */}
      <div
        ref={scrollRef}
        data-file-tree={treeView || undefined}
        role={treeView ? "tree" : undefined}
        aria-label={treeView ? "Files" : undefined}
        aria-multiselectable={treeView || undefined}
        tabIndex={treeView ? 0 : undefined}
        onKeyDown={onTreeKeyDown}
        onFocus={() => setTreeFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setTreeFocused(false);
        }}
        onClick={() => treeView && selection.clear()}
        onContextMenu={(e) => {
          if (!treeView || (!props.createNewFile && !props.createFolder)) return;
          e.preventDefault();
          selection.clear();
          actions.openMenu({ type: "background" }, e.clientX, e.clientY);
        }}
        onDragOver={(e) => {
          if (!treeView || !canDropAtRoot || touchGhost) return;
          e.preventDefault();
          setRootDragOver(true);
          e.dataTransfer.dropEffect = "move";
        }}
        onDragLeave={() => setRootDragOver(false)}
        onDrop={(e) => {
          if (!treeView) return;
          e.preventDefault();
          setRootDragOver(false);
          if (canDropAtRoot) void actions.dropInto("");
          setDraggedEntry(null);
        }}
        className={`flex-1 overflow-y-auto custom-scrollbar min-h-0 outline-none ${showColumns ? "" : "pb-1 px-2"} ${
          rootDragOver || touchDropTarget === "" ? "bg-sage/5" : ""
        }`}
      >
        {showColumns && <ListHeader />}
        {treeView ? (
          // Stripes fill the view below the last row too (under the header).
          <div className={`list-rows ${showColumns ? "min-h-[calc(100%-1.75rem)]" : ""}`}>
          <TreeNodes
            nodes={tree}
            level={0}
            isFolderCollapsed={isFolderCollapsed}
            isActiveAncestor={(path) => activeAncestorPaths.has(path)}
            onToggleFolder={toggleFolder}
            rowProps={rowProps}
            folderProps={folderProps}
            pendingCreate={actions.pendingCreate}
            setDraggedEntry={setDraggedEntry}
            onDragStartFile={actions.startDrag}
            touchDrag={{ start: startTouchDrag, isPressing: isTouchPressing, dropTarget: touchDropTarget }}
          />
          </div>
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

        {processedFiles.length === 0 && (!treeView || (tree.length === 0 && !actions.pendingCreate)) && (
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
      {actions.menu && (
        <TreeContextMenu
          x={actions.menu.x}
          y={actions.menu.y}
          label={actions.menu.target.type === "background" ? "Files" : actions.menu.target.kind === "folder" ? "Folder actions" : "File actions"}
          items={treeMenuItems(actions.menu.target, props, actions)}
          onClose={actions.closeMenu}
        />
      )}
      {touchGhost && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 max-w-[60vw] truncate rounded-lg border border-edge-subtle bg-paper-light dark:bg-paper-dark px-3 py-1.5 text-ui-footnote font-medium text-fg shadow-lg"
          style={{ left: touchGhost.x + 12, top: touchGhost.y - 36 }}
        >
          {touchGhost.name.replace(/\.md$/, "")}
        </div>
      )}
    </div>
  );
}
