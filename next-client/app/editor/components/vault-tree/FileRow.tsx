"use client";

import Button from "@/app/components/Button";
import { HiOutlineDotsVertical } from "react-icons/hi";
import FileIcon from "./FileIcon";
import { InlineNameField } from "./InlineNameField";
import { ListColumns, formatModified, kindLabel } from "./list-columns";
import type { ClickModifiers } from "./use-tree-selection";
import { useHoverPrefetch } from "@/app/hooks/file-system/use-hover-prefetch";

function HighlightedName({ name, query }: { name: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{name}</>;
  const idx = name.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{name}</>;
  return (
    <>
      {name.slice(0, idx)}
      <mark className="bg-transparent text-accent">{name.slice(idx, idx + q.length)}</mark>
      {name.slice(idx + q.length)}
    </>
  );
}

// Indent per tree level in list view (the disclosure triangle's width).
export const LIST_INDENT_PX = 16;

// Selected rows: accent while the tree has focus, gray otherwise (Finder).
export function selectionClass(isSelected: boolean, treeFocused: boolean): string {
  if (!isSelected) return "";
  return treeFocused ? "bg-accent/25 text-fg" : "bg-black/[0.08] dark:bg-white/10 text-fg";
}

// In place of a busy row's ⋯ button, after a moment (a quick rename or
// move shows only its result).
export function RowBusySpinner() {
  return (
    <span
      role="status"
      aria-label="Working…"
      className="loading-bar-appear absolute right-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center"
    >
      <span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-fg-faint border-t-transparent motion-reduce:animate-none" />
    </span>
  );
}

export interface RowEditing {
  initialValue: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}

interface FileRowProps {
  entry: any;
  entryPath?: string;
  isActive: boolean;
  highlightQuery: string;
  openFile: (handle: FileSystemFileHandle, path?: string) => void;
  onClose?: () => void;
  // The row's ⋯ button and right-click both open the tree's menu here (the
  // tree selects the row first unless it is already part of the selection).
  onOpenMenu: (x: number, y: number) => void;
  // Open on click instead of double-click.
  singleClickOpen?: boolean;
  hideFolderPath?: boolean;
  // Tree (list-view) row at this depth: fixed height, indented, with an
  // icon; omitted for the flat search list (two-line rows with the folder).
  depth?: number;
  // List view's Date Modified / Kind columns.
  showColumns?: boolean;
  modifiedAt?: number;
  // Tree selection: the click handler returns whether it was a plain click
  // (which then opens, with singleClickOpen).
  isSelected?: boolean;
  isFocused?: boolean;
  treeFocused?: boolean;
  onSelectClick?: (mods: ClickModifiers) => boolean;
  // Renaming in place.
  editing?: RowEditing;
  draggable?: boolean;
  onDragStartEntry?: () => void;
  onDragEndEntry?: () => void;
  // Touch drag (see useTouchTreeDrag).
  onTouchDragStart?: (e: React.TouchEvent) => void;
  isTouchPressing?: () => boolean;
  // Folder a touch-dragged entry dropped on this row goes into.
  dropFolder?: string;
  // A rename, move or move to Trash is working on it: a spinner, the new
  // name (`pendingName`, for a rename) and no actions until it is done.
  busy?: boolean;
  pendingName?: string;
}

export function FileRow({
  entry,
  entryPath,
  isActive,
  highlightQuery,
  openFile,
  onClose,
  onOpenMenu,
  singleClickOpen = false,
  hideFolderPath = false,
  depth,
  showColumns = false,
  modifiedAt,
  isSelected = false,
  isFocused = false,
  treeFocused = false,
  onSelectClick,
  editing,
  draggable = false,
  onDragStartEntry,
  onDragEndEntry,
  onTouchDragStart,
  isTouchPressing,
  dropFolder,
  busy = false,
  pendingName,
}: FileRowProps) {
  const isListRow = depth !== undefined;
  // The whole file name, extension included, so notes and other files read alike.
  const displayName = pendingName ?? entry.name;
  const folderPath =
    !hideFolderPath && entryPath && entryPath !== entry.name
      ? entryPath.split("/").slice(0, -1).join("/")
      : null;

  const open = () => {
    if (busy) return;
    openFile(entry.handle as FileSystemFileHandle, entryPath);
    if (onClose && window.innerWidth < 1024) onClose();
  };
  // Resting on the row reads the note ahead, so the open finds it in memory.
  const prefetch = useHoverPrefetch(entryPath ? { path: entryPath, handle: entry.handle as FileSystemFileHandle } : null);

  return (
    <div className="group relative" onPointerEnter={prefetch.onPointerEnter} onPointerLeave={prefetch.onPointerLeave}>
      <div
        role={isListRow ? "treeitem" : undefined}
        aria-selected={isListRow ? isSelected : undefined}
        aria-level={isListRow ? depth + 1 : undefined}
        aria-current={isActive ? "page" : undefined}
        aria-busy={busy || undefined}
        aria-disabled={busy || undefined}
        draggable={draggable && !editing && !busy}
        data-drop-folder={dropFolder}
        onTouchStart={busy ? undefined : onTouchDragStart}
        onDragStart={(e) => {
          if (!draggable || busy) return;
          if (isTouchPressing?.()) {
            e.preventDefault();
            return;
          }
          onDragStartEntry?.();
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => onDragEndEntry?.()}
        onClick={(e) => {
          e.stopPropagation();
          if (busy) return;
          const plain = onSelectClick ? onSelectClick(e) : true;
          if (plain && singleClickOpen) open();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (!singleClickOpen) open();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // A touch long-press picks the row up to drag (touch uses ⋯).
          if (!busy && !isTouchPressing?.()) onOpenMenu(e.clientX, e.clientY);
        }}
        tabIndex={-1}
        style={isListRow ? { paddingLeft: 12 + depth * LIST_INDENT_PX } : undefined}
        className={
          isListRow
            ? `mx-1 flex h-[var(--list-row,28px)] items-center gap-1.5 rounded-md pr-8 text-ui-subhead select-none [-webkit-touch-callout:none] ${
                isFocused && treeFocused ? "outline outline-1 -outline-offset-1 outline-accent/50 " : ""
              }${
                isSelected
                  ? `${selectionClass(true, treeFocused)} ${isActive ? "font-medium" : ""}`
                  : isActive
                    ? "bg-accent/15 text-fg font-medium"
                    : "text-fg hover:bg-paper-softgray/60 dark:hover:bg-paper-dark-surface/50"
              }`
            : `mx-1 flex items-stretch transition-all duration-200 text-ui-subhead pr-8 ${
                onTouchDragStart ? "select-none [-webkit-touch-callout:none] " : ""
              }${isActive ? "text-accent" : "text-ink-muted dark:text-stone font-medium"}`
        }
      >
        {isListRow ? (
          <>
            {/* Triangle slot, so file names line up with folder names. */}
            <span className="w-3 shrink-0" />
            <FileIcon path={entryPath ?? entry.name} />
            {editing ? (
              <InlineNameField label="File name" {...editing} />
            ) : (
              <span title={displayName} className={`min-w-0 flex-1 truncate ${busy ? "text-fg-muted" : ""}`}>
                <HighlightedName name={displayName} query={highlightQuery} />
              </span>
            )}
            {showColumns && <ListColumns modified={formatModified(modifiedAt)} kind={kindLabel(entry.name)} />}
          </>
        ) : (
        <div
          className={`flex flex-col truncate leading-tight pl-2 pr-4 py-2 min-w-0 flex-1 ${
            isActive ? "" : "hover:bg-paper-softgray/60 dark:hover:bg-paper-dark-surface/50"
          }`}
        >
          <span
            title={displayName}
            className={`truncate w-fit max-w-full ${
              isActive ? "font-semibold bg-accent/15 rounded px-1 -mx-1" : ""
            }`}
          >
            <HighlightedName name={displayName} query={highlightQuery} />
          </span>
          {folderPath && (
            <span title={folderPath} className="text-ui-caption opacity-40 truncate mt-0.5">
              {folderPath}
            </span>
          )}
        </div>
        )}
      </div>

      {busy ? <RowBusySpinner /> : !editing && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity z-10">
          <Button
            variant="icon"
            className="w-7 h-7"
            aria-label="File options"
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
