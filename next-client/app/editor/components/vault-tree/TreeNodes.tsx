"use client";

import { FileRow } from "./FileRow";
import { FolderRow, type FolderRowProps } from "./FolderRow";
import { type DraggedEntry, parentFolderPath, type TreeNode } from "./tree-model";

export function TreeNodes({
  nodes,
  level,
  isFolderCollapsed,
  isActiveAncestor,
  onToggleFolder,
  rowProps,
  draggedEntry,
  setDraggedEntry,
  onDropInto,
  touchDrag,
  folderRowExtras,
}: {
  nodes: TreeNode[];
  // Tree depth of `nodes` (0 = vault root); rows indent by it.
  level: number;
  isFolderCollapsed: (path: string) => boolean;
  isActiveAncestor: (path: string) => boolean;
  onToggleFolder: (path: string) => void;
  rowProps: (entry: any) => any;
  draggedEntry: DraggedEntry | null;
  setDraggedEntry: (v: DraggedEntry | null) => void;
  onDropInto: (targetPath: string) => void;
  touchDrag: {
    start: (e: React.TouchEvent, entry: DraggedEntry) => void;
    isPressing: () => boolean;
    dropTarget: string | null;
  };
  folderRowExtras: Omit<
    FolderRowProps,
    "node" | "depth" | "isCollapsed" | "isActiveChain" | "onToggle" | "draggedEntry" | "setDraggedEntry" | "onDropInto" | "onTouchDragStart" | "isTouchPressing" | "isTouchDropTarget"
  >;
}) {
  return (
    <>
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
                draggedEntry={draggedEntry}
                setDraggedEntry={setDraggedEntry}
                onDropInto={onDropInto}
                onTouchDragStart={(e) => touchDrag.start(e, { kind: "folder", path: node.path, name: node.name })}
                isTouchPressing={touchDrag.isPressing}
                isTouchDropTarget={touchDrag.dropTarget === node.path}
                {...folderRowExtras}
              />
              {!isCollapsed && (
                <TreeNodes
                  nodes={node.children}
                  level={level + 1}
                  isFolderCollapsed={isFolderCollapsed}
                  isActiveAncestor={isActiveAncestor}
                  onToggleFolder={onToggleFolder}
                  rowProps={rowProps}
                  draggedEntry={draggedEntry}
                  setDraggedEntry={setDraggedEntry}
                  onDropInto={onDropInto}
                  touchDrag={touchDrag}
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
              depth={level}
              draggable
              onDragStartEntry={() =>
                setDraggedEntry({ kind: "file", path: node.path, name: node.name, handle: node.entry.handle })
              }
              onDragEndEntry={() => setDraggedEntry(null)}
              onTouchDragStart={(e) =>
                touchDrag.start(e, { kind: "file", path: node.path, name: node.name, handle: node.entry.handle })
              }
              isTouchPressing={touchDrag.isPressing}
              dropFolder={parentFolderPath(node.path)}
            />
          </div>
        );
      })}
    </>
  );
}
