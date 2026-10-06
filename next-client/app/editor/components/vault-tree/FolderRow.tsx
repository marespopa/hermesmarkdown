"use client";

import Button from "@/app/components/Button";
import { useEffect, useRef, useState } from "react";
import { HiFolder, HiOutlineDotsVertical } from "react-icons/hi";
import { IoCaretForward } from "react-icons/io5";
import { LIST_INDENT_PX, type RowEditing, selectionClass } from "./FileRow";
import { InlineNameField } from "./InlineNameField";
import { ListColumns } from "./list-columns";
import { canDropInto, type DraggedEntry, type TreeFolderNode } from "./tree-model";
import type { ClickModifiers } from "./use-tree-selection";

export interface FolderRowProps {
  node: TreeFolderNode;
  depth: number;
  // List view's Date Modified / Kind columns (folders show "--" / "Folder").
  showColumns?: boolean;
  isCollapsed: boolean;
  // True when this folder is an ancestor of the currently active file —
  // gives the whole chain leading to the open file a subtle tint so it
  // reads as "this file lives here" at a glance.
  isActiveChain?: boolean;
  onToggle: (path: string) => void;
  draggedEntry: DraggedEntry | null;
  // Starts a drag of this folder (or of the whole selection it is part of).
  onDragStartFolder: () => void;
  setDraggedEntry: (v: DraggedEntry | null) => void;
  onDropInto: (targetPath: string) => void;
  // Touch drag (see useTouchTreeDrag): picks the row up on long press, and
  // highlights it while a touch-dragged entry hovers it.
  onTouchDragStart?: (e: React.TouchEvent) => void;
  isTouchPressing?: () => boolean;
  isTouchDropTarget?: boolean;
  // The ⋯ button and right-click open the tree's menu for this folder.
  onOpenMenu: (x: number, y: number) => void;
  // Selection: returns whether it was a plain click (which then toggles).
  isSelected?: boolean;
  isFocused?: boolean;
  treeFocused?: boolean;
  onSelectClick?: (mods: ClickModifiers) => boolean;
  editing?: RowEditing;
}

export function FolderRow({
  node,
  depth,
  showColumns = false,
  isCollapsed,
  isActiveChain = false,
  onToggle,
  draggedEntry,
  onDragStartFolder,
  setDraggedEntry,
  onDropInto,
  onTouchDragStart,
  isTouchPressing,
  isTouchDropTarget = false,
  onOpenMenu,
  isSelected = false,
  isFocused = false,
  treeFocused = false,
  onSelectClick,
  editing,
}: FolderRowProps) {
  const [dragOver, setDragOver] = useState(false);
  const autoExpandTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canAcceptDrop = canDropInto(draggedEntry, node.path);
  const isHighlighted = dragOver || isTouchDropTarget;

  const cancelAutoExpand = () => {
    if (autoExpandTimer.current) {
      clearTimeout(autoExpandTimer.current);
      autoExpandTimer.current = null;
    }
  };

  useEffect(() => cancelAutoExpand, [draggedEntry]);

  return (
    <div className="group relative">
      <div
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={!isCollapsed}
        aria-level={depth + 1}
        onClick={(e) => {
          e.stopPropagation();
          const plain = onSelectClick ? onSelectClick(e) : true;
          if (plain) onToggle(node.path);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // A touch long-press picks the row up to drag (touch uses ⋯).
          if (!isTouchPressing?.()) onOpenMenu(e.clientX, e.clientY);
        }}
        draggable={!editing}
        data-drop-folder={node.path}
        onTouchStart={onTouchDragStart}
        onDragStart={(e) => {
          if (isTouchPressing?.()) {
            e.preventDefault();
            return;
          }
          onDragStartFolder();
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => setDraggedEntry(null)}
        onDragOver={(e) => {
          e.preventDefault();
          if (canAcceptDrop) {
            setDragOver(true);
            e.dataTransfer.dropEffect = "move";
            if (isCollapsed && !autoExpandTimer.current) {
              autoExpandTimer.current = setTimeout(() => {
                autoExpandTimer.current = null;
                onToggle(node.path);
              }, 400);
            }
          } else {
            cancelAutoExpand();
          }
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDragOver(false);
          cancelAutoExpand();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          cancelAutoExpand();
          if (canAcceptDrop) onDropInto(node.path);
          setDraggedEntry(null);
        }}
        tabIndex={-1}
        style={{ paddingLeft: 12 + depth * LIST_INDENT_PX }}
        className={`mx-1 flex h-[var(--list-row,28px)] items-center gap-1.5 rounded-md pr-8 cursor-pointer text-ui-subhead relative select-none [-webkit-touch-callout:none] ${
          isFocused && treeFocused ? "outline outline-1 -outline-offset-1 outline-accent/50 " : ""
        }${
          isHighlighted
            ? "ring-2 ring-inset ring-sage/50 bg-sage/10 text-sage dark:text-sage"
            : isSelected
              ? `${selectionClass(true, treeFocused)} ${isActiveChain ? "font-medium" : ""}`
              : `text-fg hover:bg-paper-softgray/60 dark:hover:bg-paper-dark-surface/50 ${isActiveChain ? "font-medium" : ""}`
        }`}
      >
        <IoCaretForward
          size={10}
          aria-hidden
          onClick={(e) => {
            // The triangle only opens and closes, whatever the modifiers.
            e.stopPropagation();
            onToggle(node.path);
          }}
          className={`w-3 shrink-0 text-fg-faint transition-transform duration-150 ${isCollapsed ? "" : "rotate-90"}`}
        />
        <HiFolder size={16} className="shrink-0 text-sage" />
        {editing ? (
          <InlineNameField label="Folder name" {...editing} />
        ) : (
          <span title={node.name} className="min-w-0 flex-1 truncate">{node.name}</span>
        )}
        {showColumns && <ListColumns modified="--" kind="Folder" />}
      </div>

      {!editing && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity z-10">
          <Button
            variant="icon"
            className="w-7 h-7"
            aria-label="Folder options"
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
