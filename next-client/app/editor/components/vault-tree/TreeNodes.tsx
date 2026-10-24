"use client";

import { HiFolder, HiOutlineDocumentText } from "react-icons/hi";
import { FileRow, LIST_INDENT_PX, type RowEditing } from "./FileRow";
import { FolderRow, type FolderRowProps } from "./FolderRow";
import { InlineNameField } from "./InlineNameField";
import { type DraggedEntry, parentFolderPath, type TreeFolderNode, type VisibleRow } from "./tree-model";

export interface PendingCreate {
  kind: "file" | "folder";
  parentPath: string;
  editing: RowEditing;
}

// The not-yet-created note or folder being named, first in its folder.
function PendingRow({ pending, depth }: { pending: PendingCreate; depth: number }) {
  const Icon = pending.kind === "folder" ? HiFolder : HiOutlineDocumentText;
  return (
    <div
      role="treeitem"
      aria-selected
      aria-level={depth + 1}
      style={{ paddingLeft: 12 + depth * LIST_INDENT_PX }}
      className="mx-1 flex h-[var(--list-row,28px)] items-center gap-1.5 rounded-md pr-8 text-ui-subhead"
    >
      <span className="w-3 shrink-0" />
      <Icon size={16} className={`shrink-0 ${pending.kind === "folder" ? "text-sage" : "text-fg-faint"}`} />
      <InlineNameField label={pending.kind === "folder" ? "New folder name" : "New note name"} {...pending.editing} />
    </div>
  );
}

// One line of the tree as shown: a folder or file row, or the pending
// new item. The tree renders this flat list (virtualized when long), so a
// folder's rows aren't nested in its element.
export type TreeItem =
  | { kind: "pending"; key: string; depth: number }
  | { kind: "row"; key: string; row: VisibleRow };

// The visible rows, with the item being named first in its folder (shown
// only while that folder is open, as its other rows are).
export function treeItems(rows: VisibleRow[], pending: PendingCreate | null, isFolderCollapsed: (path: string) => boolean): TreeItem[] {
  const items: TreeItem[] = rows.map((row) => ({ kind: "row", key: `${row.type}-${row.path}`, row }));
  if (!pending) return items;
  const pendingItem = (depth: number): TreeItem => ({ kind: "pending", key: "pending", depth });
  if (!pending.parentPath) return [pendingItem(0), ...items];
  const at = items.findIndex((item) => item.kind === "row" && item.row.type === "folder" && item.row.path === pending.parentPath);
  if (at === -1 || isFolderCollapsed(pending.parentPath)) return items;
  const parent = items[at] as Extract<TreeItem, { kind: "row" }>;
  items.splice(at + 1, 0, pendingItem(parent.row.depth + 1));
  return items;
}

export interface TreeItemRowProps {
  item: TreeItem;
  pendingCreate: PendingCreate | null;
  isFolderCollapsed: (path: string) => boolean;
  isActiveAncestor: (path: string) => boolean;
  onToggleFolder: (path: string) => void;
  rowProps: (entry: any) => any;
  // Per-folder props from the tree (selection, editing, menu, drag/drop).
  folderProps: (node: TreeFolderNode) => Omit<
    FolderRowProps,
    "node" | "depth" | "isCollapsed" | "isActiveChain" | "onToggle" | "onTouchDragStart" | "isTouchPressing" | "isTouchDropTarget"
  >;
  setDraggedEntry: (v: DraggedEntry | null) => void;
  onDragStartFile: (entry: DraggedEntry) => void;
  touchDrag: {
    start: (e: React.TouchEvent, entry: DraggedEntry) => void;
    isPressing: () => boolean;
    dropTarget: string | null;
  };
}

export function TreeItemRow({
  item,
  pendingCreate,
  isFolderCollapsed,
  isActiveAncestor,
  onToggleFolder,
  rowProps,
  folderProps,
  setDraggedEntry,
  onDragStartFile,
  touchDrag,
}: TreeItemRowProps) {
  if (item.kind === "pending") {
    return pendingCreate ? <PendingRow pending={pendingCreate} depth={item.depth} /> : null;
  }
  const { node, depth } = item.row;
  if (node.type === "folder") {
    return (
      <div data-path={node.path}>
        <FolderRow
          node={node}
          depth={depth}
          isCollapsed={isFolderCollapsed(node.path)}
          isActiveChain={isActiveAncestor(node.path)}
          onToggle={onToggleFolder}
          onTouchDragStart={(e) => touchDrag.start(e, { kind: "folder", path: node.path, name: node.name })}
          isTouchPressing={touchDrag.isPressing}
          isTouchDropTarget={touchDrag.dropTarget === node.path}
          {...folderProps(node)}
        />
      </div>
    );
  }

  const dragged: DraggedEntry = { kind: "file", path: node.path, name: node.name, handle: node.entry.handle };
  return (
    <div data-path={node.path}>
      <FileRow
        {...rowProps(node.entry)}
        hideFolderPath
        depth={depth}
        draggable
        onDragStartEntry={() => onDragStartFile(dragged)}
        onDragEndEntry={() => setDraggedEntry(null)}
        onTouchDragStart={(e) => touchDrag.start(e, dragged)}
        isTouchPressing={touchDrag.isPressing}
        dropFolder={parentFolderPath(node.path)}
      />
    </div>
  );
}
