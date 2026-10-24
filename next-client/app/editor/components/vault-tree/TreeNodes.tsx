"use client";

import { HiFolder, HiOutlineDocumentText } from "react-icons/hi";
import { FileRow, LIST_INDENT_PX, type RowEditing } from "./FileRow";
import { FolderRow, type FolderRowProps } from "./FolderRow";
import { InlineNameField } from "./InlineNameField";
import { type DraggedEntry, parentFolderPath, type TreeFolderNode, type TreeNode } from "./tree-model";

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

export function TreeNodes({
  nodes,
  level,
  parentPath = "",
  isFolderCollapsed,
  isActiveAncestor,
  onToggleFolder,
  rowProps,
  folderProps,
  pendingCreate,
  setDraggedEntry,
  onDragStartFile,
  touchDrag,
}: {
  nodes: TreeNode[];
  // Tree depth of `nodes` (0 = vault root); rows indent by it.
  level: number;
  parentPath?: string;
  isFolderCollapsed: (path: string) => boolean;
  isActiveAncestor: (path: string) => boolean;
  onToggleFolder: (path: string) => void;
  rowProps: (entry: any) => any;
  // Per-folder props from the tree (selection, editing, menu, drag/drop).
  folderProps: (node: TreeFolderNode) => Omit<
    FolderRowProps,
    "node" | "depth" | "isCollapsed" | "isActiveChain" | "onToggle" | "onTouchDragStart" | "isTouchPressing" | "isTouchDropTarget"
  >;
  pendingCreate: PendingCreate | null;
  setDraggedEntry: (v: DraggedEntry | null) => void;
  onDragStartFile: (entry: DraggedEntry) => void;
  touchDrag: {
    start: (e: React.TouchEvent, entry: DraggedEntry) => void;
    isPressing: () => boolean;
    dropTarget: string | null;
  };
}) {
  return (
    <>
      {pendingCreate?.parentPath === parentPath && <PendingRow pending={pendingCreate} depth={level} />}
      {nodes.map((node) => {
        if (node.type === "folder") {
          const isCollapsed = isFolderCollapsed(node.path);
          return (
            <div key={`folder-${node.path}`} data-path={node.path}>
              <FolderRow
                node={node}
                depth={level}
                isCollapsed={isCollapsed}
                isActiveChain={isActiveAncestor(node.path)}
                onToggle={onToggleFolder}
                onTouchDragStart={(e) => touchDrag.start(e, { kind: "folder", path: node.path, name: node.name })}
                isTouchPressing={touchDrag.isPressing}
                isTouchDropTarget={touchDrag.dropTarget === node.path}
                {...folderProps(node)}
              />
              {!isCollapsed && (
                <TreeNodes
                  nodes={node.children}
                  level={level + 1}
                  parentPath={node.path}
                  isFolderCollapsed={isFolderCollapsed}
                  isActiveAncestor={isActiveAncestor}
                  onToggleFolder={onToggleFolder}
                  rowProps={rowProps}
                  folderProps={folderProps}
                  pendingCreate={pendingCreate}
                  setDraggedEntry={setDraggedEntry}
                  onDragStartFile={onDragStartFile}
                  touchDrag={touchDrag}
                />
              )}
            </div>
          );
        }

        const dragged: DraggedEntry = { kind: "file", path: node.path, name: node.name, handle: node.entry.handle };
        return (
          <div key={`file-${node.path}`} data-path={node.path}>
            <FileRow
              {...rowProps(node.entry)}
              hideFolderPath
              depth={level}
              draggable
              onDragStartEntry={() => onDragStartFile(dragged)}
              onDragEndEntry={() => setDraggedEntry(null)}
              onTouchDragStart={(e) => touchDrag.start(e, dragged)}
              isTouchPressing={touchDrag.isPressing}
              dropFolder={parentFolderPath(node.path)}
            />
          </div>
        );
      })}
    </>
  );
}
