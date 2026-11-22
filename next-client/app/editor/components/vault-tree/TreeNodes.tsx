"use client";

import Button from "@/app/components/Button";
import { HiFolder, HiOutlineDocumentText, HiOutlineDotsVertical } from "react-icons/hi";
import { IoCaretForward } from "react-icons/io5";
import { isMountRoot, mountOf } from "@/app/services/library-roots";
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
      <InlineNameField label={pending.kind === "folder" ? "New folder name" : "New file name"} {...pending.editing} />
    </div>
  );
}

// One line of the tree as shown: a folder or file row, or the pending
// new item. The tree renders this flat list (virtualized when long), so a
// folder's rows aren't nested in its element.
export type TreeItem =
  | { kind: "pending"; key: string; depth: number }
  | { kind: "section"; key: string; name: string }
  | { kind: "row"; key: string; row: VisibleRow };

// The visible rows, with the item being named first in its folder (shown
// only while that folder is open, as its other rows are). With `vaultSection`
// (a library with added folders), a header with the vault's name comes
// first, so the vault reads as one section beside the added folders' own.
// Rows inside an added folder sit one level less deep, so its notes line up
// with the vault's.
export function treeItems(
  rows: VisibleRow[],
  pending: PendingCreate | null,
  isFolderCollapsed: (path: string) => boolean,
  vaultSection?: string | null,
): TreeItem[] {
  const shifted = vaultSection
    ? rows.map((row) => (mountOf(row.path) && !isMountRoot(row.path) ? { ...row, depth: row.depth - 1 } : row))
    : rows;
  const items: TreeItem[] = shifted.map((row) => ({ kind: "row", key: `${row.type}-${row.path}`, row }));
  const header: TreeItem[] = vaultSection ? [{ kind: "section", key: "section-vault", name: vaultSection }] : [];
  if (!pending) return [...header, ...items];
  const pendingItem = (depth: number): TreeItem => ({ kind: "pending", key: "pending", depth });
  if (!pending.parentPath) return [...header, pendingItem(0), ...items];
  const at = items.findIndex((item) => item.kind === "row" && item.row.type === "folder" && item.row.path === pending.parentPath);
  if (at === -1 || isFolderCollapsed(pending.parentPath)) return items;
  const parent = items[at] as Extract<TreeItem, { kind: "row" }>;
  items.splice(at + 1, 0, pendingItem(isMountRoot(parent.row.path) && vaultSection ? 0 : parent.row.depth + 1));
  return [...header, ...items];
}

// The vault's header in a library: its name, quiet like a sidebar section's
// title, with the root's menu (New File, New Folder, Add Folder to Library).
// A click opens or closes it, like an added folder's row.
function VaultSectionRow({ name, collapsed = false, onToggle, onOpenMenu }: {
  name: string;
  collapsed?: boolean;
  onToggle?: () => void;
  onOpenMenu?: (x: number, y: number) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={-1}
      aria-expanded={!collapsed}
      aria-label={name}
      onClick={(e) => {
        e.stopPropagation();
        onToggle?.();
      }}
      onContextMenu={(e) => {
        if (!onOpenMenu) return;
        e.preventDefault();
        e.stopPropagation();
        onOpenMenu(e.clientX, e.clientY);
      }}
      className="group relative mx-1 flex h-[var(--list-row,28px)] cursor-pointer items-center gap-1.5 rounded-md pl-3 pr-8 text-ui-caption text-fg-faint select-none hover:bg-paper-softgray/60 dark:hover:bg-paper-dark-surface/50"
    >
      <IoCaretForward
        size={10}
        aria-hidden
        className={`w-3 shrink-0 text-fg-faint transition-transform duration-layout ease-layout motion-reduce:transition-none ${collapsed ? "" : "rotate-90"}`}
      />
      <span title={name} className="min-w-0 flex-1 truncate">{name}</span>
      {onOpenMenu && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity z-10">
          <Button
            variant="icon"
            className="w-7 h-7"
            aria-label={`${name} options`}
            aria-haspopup="menu"
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              onOpenMenu(rect.right - 200, rect.bottom + 4);
            }}
          >
            <HiOutlineDotsVertical size={14} className="opacity-80" />
          </Button>
        </div>
      )}
    </div>
  );
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
  // The vault section header's ⋯ button and right-click (the root's menu),
  // and its open / closed state.
  onOpenVaultMenu?: (x: number, y: number) => void;
  vaultCollapsed?: boolean;
  onToggleVault?: () => void;
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
  onOpenVaultMenu,
  vaultCollapsed,
  onToggleVault,
}: TreeItemRowProps) {
  if (item.kind === "pending") {
    return pendingCreate ? <PendingRow pending={pendingCreate} depth={item.depth} /> : null;
  }
  if (item.kind === "section") {
    return <VaultSectionRow name={item.name} collapsed={vaultCollapsed} onToggle={onToggleVault} onOpenMenu={onOpenVaultMenu} />;
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
