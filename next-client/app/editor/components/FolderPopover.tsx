"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { HiChevronRight, HiOutlineArrowLeft, HiOutlineDatabase, HiOutlineDocumentAdd, HiOutlineDocumentText, HiOutlineFolder, HiOutlineLogout } from "react-icons/hi";
import { TbLayoutSidebarLeftExpand } from "react-icons/tb";
import Button from "@/app/components/Button";
import BareInput from "@/app/components/Input/BareInput";
import Tooltip from "@/app/components/Tooltip";
import { FIELD_COMPACT_CLASS } from "@/app/components/Input/field-styles";
import { useVaultFileSearch } from "../hooks/useVaultFileSearch";
import { useVaultMenuItems } from "../hooks/use-vault-menu-items";
import { folderName, listFolder, listingRows, parentOf, searchBelow, type FolderRow } from "./folder-listing";
import { MENU_ICON_CLASS, MENU_PANEL_CLASS, MENU_SEPARATOR_CLASS } from "./menu-classes";
import TabContextMenu, { type TabContextMenuItem } from "./TabContextMenu";
import { fileCreateActions } from "./vault-tree/file-create-actions";
import { VIRTUALIZE_THRESHOLD } from "./vault-tree/tree-model";

interface FolderPopoverProps {
  /** The folder it opens on ("" = the vault's root). */
  folder: string;
  /** The breadcrumb that opened it: the popover hangs below its left edge. */
  anchor: DOMRect;
  /** The note in the pane, marked in its folder's list. */
  currentPath: string | null;
  /** Shown for the vault's root. */
  rootName: string;
  onOpenNote: (handle: FileSystemFileHandle, path: string) => void;
  /** Creates (and opens) a note named `name` in `folder`; absent hides New File. */
  onNewNote?: (folder: string, name: string) => void;
  /** Creates a folder named `name` in `folder`, resolving to its path (null
   *  when it failed); absent hides New Folder. */
  onNewFolder?: (folder: string, name: string) => Promise<string | null>;
  /** Shows the folder in the sidebar's Files; absent where there's no sidebar. */
  onShowInFiles?: (folder: string) => void;
  /** Close Vault, last in the root's Vault submenu. */
  onCloseVault?: () => void;
  onClose: () => void;
  /** Its anchor is out of sight (a pinned folder's row in the hidden
   *  sidebar): the popover opens centred near the window's top instead, where
   *  the command palette does. */
  centered?: boolean;
}

// How far down the window a centred popover starts, as the palette's.
const CENTERED_TOP = 0.15;

const EDGE = 8;
const NO_TAGS: string[] = [];
const ACTIVE_ROW = "bg-black/[0.05] dark:bg-white/[0.08]";
// A menu row (32px) and the 1px gap under it; rows measure themselves.
const ROW_SIZE = 33;

type Creating = "note" | "folder" | null;

// A folder's notes and subfolders, under the pane title's breadcrumb (as a
// code editor's breadcrumbs or a path bar's folder menus): a click on a
// subfolder steps into it and the ← row steps up, a click on a note opens it
// in the pane. Typing searches everything below the folder (the whole vault
// from its root), each match with its folder beside it; ↑/↓ move, Enter
// opens (with no matches, a "Create “…”" row makes a note by that name in
// the folder), → enters a folder, ← or Backspace (with nothing typed) goes up,
// Escape or a click outside closes it. Past VIRTUALIZE_THRESHOLD rows the
// list is virtualized. The header's New File and New Folder buttons turn the
// field into a name field for that folder: Enter creates (a note opens, a
// new folder is stepped into), Escape backs out. The footer stays short (one
// row per group, as menus should): "Show in Files" shows the folder in the
// sidebar's tree, and at the vault's root "Vault ▸" opens a submenu with the
// vault switcher (useVaultMenuItems: recent vaults, Open / Create / Browser
// Vault) and Close Vault.
// Rendered into `document.body` in the shared menu look (menu-classes.ts).
export default function FolderPopover({ folder, anchor, currentPath, rootName, onOpenNote, onNewNote, onNewFolder, onShowInFiles, onCloseVault, onClose, centered = false }: FolderPopoverProps) {
  const { allFiles, folderPaths } = useVaultFileSearch({ selectedTags: NO_TAGS, panel: "files" });
  const vaultSwitcher = useVaultMenuItems();
  const [dir, setDir] = useState(folder);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [creating, setCreating] = useState<Creating>(null);
  const [newName, setNewName] = useState("");
  // The root's Vault submenu, beside its row.
  const [vaultMenu, setVaultMenu] = useState<{ x: number; y: number } | null>(null);
  const vaultRowRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState({ x: anchor.left, y: anchor.bottom + 4, ready: false });

  const rows: FolderRow[] = useMemo(
    () => (query.trim() ? searchBelow(dir, allFiles, folderPaths, query) : listingRows(listFolder(dir, allFiles, folderPaths))),
    [dir, allFiles, folderPaths, query],
  );
  const activeIndex = Math.min(active, rows.length - 1);
  // A search with no matches offers to create a note by that name, here.
  const typed = query.trim();
  const offerCreate = !rows.length && !!typed && !!onNewNote;
  const createFromQuery = () => {
    onClose();
    onNewNote?.(dir, typed);
  };
  const virtualize = rows.length > VIRTUALIZE_THRESHOLD;
  const virtualizer = useVirtualizer({
    count: virtualize ? rows.length : 0,
    getScrollElement: () => listRef.current,
    estimateSize: () => ROW_SIZE,
    overscan: 10,
  });

  const enter = (path: string) => {
    setDir(path);
    setQuery("");
    setActive(0);
  };
  const up = () => {
    if (dir) enter(parentOf(dir));
  };
  const choose = (index: number) => {
    const row = rows[index];
    if (!row) return;
    if (row.kind === "folder") {
      enter(row.path);
      return;
    }
    onOpenNote(row.handle, row.path);
    onClose();
  };
  const startCreate = (kind: Creating) => {
    setCreating(kind);
    setNewName("");
    setQuery("");
    setActive(0);
    inputRef.current?.focus({ preventScroll: true });
  };
  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    if (creating === "note") {
      onClose();
      onNewNote?.(dir, name);
      return;
    }
    const path = await onNewFolder?.(dir, name);
    setCreating(null);
    setNewName("");
    if (path) enter(path);
  };

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Element;
      // The Vault submenu is portaled outside the panel but belongs to it.
      if (panelRef.current?.contains(target) || target.closest?.('[role="menu"][aria-label="Vault"]')) return;
      onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [onClose]);

  // Focus goes to the filter, and back where it was on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    inputRef.current?.focus({ preventScroll: true });
    return () => {
      if (previous?.isConnected && (!document.activeElement || document.activeElement === document.body)) {
        previous.focus({ preventScroll: true });
      }
    };
  }, []);

  // Kept on screen: shifted left at the right edge, raised at the bottom.
  useLayoutEffect(() => {
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (centered) {
      const top = Math.round(window.innerHeight * CENTERED_TOP);
      setPos({
        x: Math.max(EDGE, Math.round((window.innerWidth - rect.width) / 2)),
        y: top + rect.height > window.innerHeight - EDGE ? Math.max(EDGE, window.innerHeight - rect.height - EDGE) : top,
        ready: true,
      });
      return;
    }
    const x = Math.max(EDGE, Math.min(anchor.left, window.innerWidth - rect.width - EDGE));
    const below = anchor.bottom + 4;
    const y = below + rect.height > window.innerHeight - EDGE ? Math.max(EDGE, window.innerHeight - rect.height - EDGE) : below;
    setPos({ x, y, ready: true });
  }, [anchor, centered]);

  // A new folder or search starts at the top of its list.
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [dir, query]);

  useEffect(() => {
    if (virtualize) {
      if (activeIndex >= 0) virtualizer.scrollToIndex(activeIndex, { align: "auto" });
      return;
    }
    panelRef.current?.querySelector(`[data-row="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, virtualize, virtualizer]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (creating) {
      if (event.key === "Enter") {
        event.preventDefault();
        void create();
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setCreating(null);
      }
      return;
    }
    const row = rows[activeIndex];
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!rows.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((activeIndex + step + rows.length) % rows.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (offerCreate) createFromQuery();
      else choose(activeIndex);
    } else if (event.key === "ArrowRight" && row?.kind === "folder" && event.currentTarget.selectionStart === query.length) {
      event.preventDefault();
      enter(row.path);
    } else if ((event.key === "ArrowLeft" || event.key === "Backspace") && !query && dir) {
      event.preventDefault();
      up();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
  };

  const name = folderName(dir, rootName);
  const createButtons = fileCreateActions({
    newNote: onNewNote ? () => startCreate("note") : undefined,
    newFolder: onNewFolder ? () => startCreate("folder") : undefined,
  });
  // Each closes the popover before it acts.
  const vaultItems: TabContextMenuItem[] = dir ? [] : [
    ...vaultSwitcher.map((item) => ({ ...item, onClick: () => { onClose(); item.onClick(); } })),
    ...(onCloseVault ? [{ label: "Close Vault", icon: <HiOutlineLogout size={15} aria-hidden="true" />, divider: true, onClick: () => { onClose(); onCloseVault(); } }] : []),
  ];
  const hasFooter = !!onShowInFiles || vaultItems.length > 0;
  const fieldLabel = creating === "note" ? "New file name" : creating === "folder" ? "New folder name" : null;

  const renderRow = (row: FolderRow, index: number) => (
    <Button
      key={`${row.kind}:${row.path}`}
      id={`folder-popover-row-${index}`}
      data-row={index}
      variant="menu-row"
      role="option"
      aria-selected={index === activeIndex}
      aria-current={row.path === currentPath ? "page" : undefined}
      tabIndex={-1}
      onClick={() => choose(index)}
      title={row.where !== undefined ? row.path : undefined}
      className={`${index === activeIndex ? ACTIVE_ROW : ""} ${row.path === currentPath ? "font-medium" : ""}`}
    >
      <span className={MENU_ICON_CLASS}>
        {row.kind === "folder" ? <HiOutlineFolder size={15} aria-hidden="true" /> : <HiOutlineDocumentText size={15} aria-hidden="true" />}
      </span>
      <span className="flex-1 truncate">{row.name}</span>
      {row.where ? <span className="max-w-[45%] shrink-0 truncate text-ui-caption text-fg-faint">{row.where}</span> : null}
    </Button>
  );

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`Folder ${name}`}
      style={{ left: pos.x, top: pos.y }}
      className={`${MENU_PANEL_CLASS} w-[min(20rem,calc(100vw-16px))] ${centered ? "origin-top" : "origin-top-left"} transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none ${pos.ready ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
    >
      <div className="flex items-center gap-1 px-1 pt-0.5">
        <Button
          variant="icon-small"
          onClick={up}
          isDisabled={!dir}
          aria-label={dir ? `Up to ${folderName(parentOf(dir), rootName)}` : "At the vault's top"}
          title={dir ? `Up to ${folderName(parentOf(dir), rootName)}` : undefined}
        >
          <HiOutlineArrowLeft size={14} aria-hidden="true" />
        </Button>
        <span className="min-w-0 flex-1 truncate text-ui-footnote font-medium text-fg-muted" title={dir || rootName}>{name}</span>
        {createButtons.map((action) => (
          // Portaled: the panel is a fixed layer of its own.
          <Tooltip key={action.id} label={`${action.label} in ${name}`} position="bottom-end" portal>
            <Button
              variant="icon-small"
              onClick={action.onSelect}
              aria-label={action.label}
              aria-pressed={creating === action.id}
            >
              {action.icon}
            </Button>
          </Tooltip>
        ))}
      </div>
      <BareInput
        ref={inputRef}
        value={creating ? newName : query}
        onChange={(event) => {
          if (creating) {
            setNewName(event.target.value);
            return;
          }
          setQuery(event.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        // Leaving the name field (a click on a row, say) backs out of it.
        onBlur={() => { if (creating) setCreating(null); }}
        placeholder={fieldLabel ? `${fieldLabel} in ${name}` : "Filter"}
        aria-label={fieldLabel ?? "Filter this folder"}
        aria-controls={creating ? undefined : "folder-popover-list"}
        aria-activedescendant={creating ? undefined : rows.length ? `folder-popover-row-${activeIndex}` : offerCreate ? "folder-popover-create" : undefined}
        spellCheck={false}
        className={`${FIELD_COMPACT_CLASS} mx-1 my-1`}
      />
      <div ref={listRef} id="folder-popover-list" role="listbox" aria-label={name} className="flex max-h-[min(22rem,50vh)] flex-col gap-px overflow-y-auto">
        {virtualize ? (
          <div role="presentation" className="relative w-full shrink-0" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((item) => (
              <div
                key={item.key}
                ref={virtualizer.measureElement}
                data-index={item.index}
                role="presentation"
                className="absolute inset-x-0 top-0 pb-px"
                style={{ transform: `translateY(${item.start}px)` }}
              >
                {renderRow(rows[item.index], item.index)}
              </div>
            ))}
          </div>
        ) : (
          rows.map(renderRow)
        )}
        {offerCreate ? (
          <Button
            id="folder-popover-create"
            variant="menu-row"
            role="option"
            aria-selected
            tabIndex={-1}
            onClick={createFromQuery}
            title={`New File “${typed}” in ${name}`}
            className={ACTIVE_ROW}
          >
            <span className={MENU_ICON_CLASS}><HiOutlineDocumentAdd size={15} aria-hidden="true" /></span>
            <span className="flex-1 truncate">Create “{typed}”</span>
            <span className="max-w-[45%] shrink-0 truncate text-ui-caption text-fg-faint">{name}</span>
          </Button>
        ) : !rows.length && (
          <p className="px-2.5 py-2 text-ui-footnote text-fg-faint">{typed ? "No matches" : "Empty folder"}</p>
        )}
      </div>
      {hasFooter && <div role="separator" className={MENU_SEPARATOR_CLASS} />}
      {onShowInFiles && (
        <Button variant="menu-row" onClick={() => { onClose(); onShowInFiles(dir); }}>
          <span className={MENU_ICON_CLASS}><TbLayoutSidebarLeftExpand size={15} aria-hidden="true" /></span>
          <span className="flex-1 truncate">Show in Files</span>
        </Button>
      )}
      {vaultItems.length > 0 && (
        <Button
          ref={vaultRowRef}
          variant="menu-row"
          aria-haspopup="menu"
          aria-expanded={!!vaultMenu}
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setVaultMenu((open) => (open ? null : { x: rect.right + 4, y: rect.top - 4 }));
          }}
          className={vaultMenu ? ACTIVE_ROW : ""}
        >
          <span className={MENU_ICON_CLASS}><HiOutlineDatabase size={15} aria-hidden="true" /></span>
          <span className="flex-1 truncate">Vault</span>
          <HiChevronRight size={13} aria-hidden="true" className="shrink-0 text-fg-faint" />
        </Button>
      )}
      {vaultMenu && (
        <TabContextMenu
          x={vaultMenu.x}
          y={vaultMenu.y}
          items={vaultItems}
          label="Vault"
          anchorRef={vaultRowRef}
          onClose={() => setVaultMenu(null)}
        />
      )}
    </div>,
    document.body,
  );
}
