"use client";

import { FileRow } from "./FileRow";
import { FolderRow, type FolderRowProps } from "./FolderRow";
import type { DraggedEntry, TreeNode } from "./tree-model";

export function TreeNodes({
  nodes,
  level,
  ancestorLines,
  isFolderCollapsed,
  isActiveAncestor,
  onToggleFolder,
  rowProps,
  draggedEntry,
  setDraggedEntry,
  onDropInto,
  folderRowExtras,
}: {
  nodes: TreeNode[];
  level: number;
  // Continuation flags for each ancestor column above this row's own branch
  // (true = that ancestor still has siblings below it, so its line continues).
  // The root call passes [] — level 0 renders flush, with no gutter at all.
  ancestorLines: boolean[];
  isFolderCollapsed: (path: string) => boolean;
  isActiveAncestor: (path: string) => boolean;
  onToggleFolder: (path: string) => void;
  rowProps: (entry: any) => any;
  draggedEntry: DraggedEntry | null;
  setDraggedEntry: (v: DraggedEntry | null) => void;
  onDropInto: (targetPath: string) => void;
  folderRowExtras: Omit<FolderRowProps, "node" | "treeGutter" | "isCollapsed" | "isActiveChain" | "onToggle" | "draggedEntry" | "setDraggedEntry" | "onDropInto">;
}) {
  return (
    <>
      {nodes.map((node, index) => {
        const isLast = index === nodes.length - 1;
        const treeGutter = level > 0 ? { ancestorLines, isLast } : undefined;

        if (node.type === "folder") {
          const isCollapsed = isFolderCollapsed(node.path);
          const childAncestorLines = level === 0 ? [] : [...ancestorLines, !isLast];
          return (
            <div key={`folder-${node.path}`} data-path={node.path}>
              <FolderRow
                node={node}
                treeGutter={treeGutter}
                isCollapsed={isCollapsed}
                isActiveChain={isActiveAncestor(node.path)}
                onToggle={onToggleFolder}
                draggedEntry={draggedEntry}
                setDraggedEntry={setDraggedEntry}
                onDropInto={onDropInto}
                {...folderRowExtras}
              />
              {!isCollapsed && (
                <TreeNodes
                  nodes={node.children}
                  level={level + 1}
                  ancestorLines={childAncestorLines}
                  isFolderCollapsed={isFolderCollapsed}
                  isActiveAncestor={isActiveAncestor}
                  onToggleFolder={onToggleFolder}
                  rowProps={rowProps}
                  draggedEntry={draggedEntry}
                  setDraggedEntry={setDraggedEntry}
                  onDropInto={onDropInto}
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
              treeGutter={treeGutter}
              draggable
              onDragStartEntry={() =>
                setDraggedEntry({ kind: "file", path: node.path, name: node.name, handle: node.entry.handle })
              }
              onDragEndEntry={() => setDraggedEntry(null)}
            />
          </div>
        );
      })}
    </>
  );
}
