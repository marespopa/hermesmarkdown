"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HiOutlineArrowLeft, HiOutlineDocumentText, HiOutlineFolder, HiOutlineLogout } from "react-icons/hi";
import { TbLayoutSidebarLeftExpand } from "react-icons/tb";
import Button from "@/app/components/Button";
import BareInput from "@/app/components/Input/BareInput";
import { FIELD_COMPACT_CLASS } from "@/app/components/Input/field-styles";
import { useVaultFileSearch } from "../hooks/useVaultFileSearch";
import { useVaultMenuItems } from "../hooks/use-vault-menu-items";
import { filterListing, folderName, listFolder, parentOf } from "./folder-listing";
import { MENU_ICON_CLASS, MENU_PANEL_CLASS, MENU_SEPARATOR_CLASS } from "./menu-classes";

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
  /** Shows the folder in the sidebar's Files; absent where there's no sidebar. */
  onShowInFiles?: (folder: string) => void;
  /** Close Vault, listed after the vault switcher while it's on the vault's root. */
  onCloseVault?: () => void;
  onClose: () => void;
}

const EDGE = 8;
const NO_TAGS: string[] = [];
const ACTIVE_ROW = "bg-black/[0.05] dark:bg-white/[0.08]";

// A folder's notes and subfolders, under the pane title's breadcrumb (as a
// code editor's breadcrumbs or a path bar's folder menus): a click on a
// subfolder steps into it and the ← row steps up, a click on a note opens it
// in the pane. Typing filters the list; ↑/↓ move, Enter opens, → enters a
// folder, ← or Backspace (with nothing typed) goes up, Escape or a click
// outside closes it. "Show in Files" shows the folder in the sidebar's tree;
// at the vault's root, the vault switcher (useVaultMenuItems: recent vaults,
// Open / Create / Browser Vault) and Close Vault follow it.
// Rendered into `document.body` in the shared menu look (menu-classes.ts).
export default function FolderPopover({ folder, anchor, currentPath, rootName, onOpenNote, onShowInFiles, onCloseVault, onClose }: FolderPopoverProps) {
  const { allFiles, folderPaths } = useVaultFileSearch({ selectedTags: NO_TAGS, panel: "files" });
  const vaultItems = useVaultMenuItems();
  const [dir, setDir] = useState(folder);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState({ x: anchor.left, y: anchor.bottom + 4, ready: false });

  const listing = useMemo(
    () => filterListing(listFolder(dir, allFiles, folderPaths), query),
    [dir, allFiles, folderPaths, query],
  );
  const rows = useMemo(() => [
    ...listing.folders.map((entry) => ({ kind: "folder" as const, ...entry })),
    ...listing.notes.map((entry) => ({ kind: "note" as const, ...entry })),
  ], [listing]);
  const activeIndex = Math.min(active, rows.length - 1);

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

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) onClose();
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
    const x = Math.max(EDGE, Math.min(anchor.left, window.innerWidth - rect.width - EDGE));
    const below = anchor.bottom + 4;
    const y = below + rect.height > window.innerHeight - EDGE ? Math.max(EDGE, window.innerHeight - rect.height - EDGE) : below;
    setPos({ x, y, ready: true });
  }, [anchor]);

  useEffect(() => {
    panelRef.current?.querySelector(`[data-row="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const row = rows[activeIndex];
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!rows.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((activeIndex + step + rows.length) % rows.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(activeIndex);
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
  // The footer's rows, each closing the popover before it acts.
  const actions: { label: string; icon?: React.ReactNode; run: () => void }[] = [
    ...(onShowInFiles ? [{ label: "Show in Files", icon: <TbLayoutSidebarLeftExpand size={15} aria-hidden="true" />, run: () => onShowInFiles(dir) }] : []),
    ...(!dir ? vaultItems.map((item) => ({ label: item.label, icon: item.icon, run: item.onClick })) : []),
    ...(!dir && onCloseVault ? [{ label: "Close Vault", icon: <HiOutlineLogout size={15} aria-hidden="true" />, run: onCloseVault }] : []),
  ];
  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`Folder ${name}`}
      style={{ left: pos.x, top: pos.y }}
      className={`${MENU_PANEL_CLASS} w-[min(18rem,calc(100vw-16px))] origin-top-left transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none ${pos.ready ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
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
      </div>
      <BareInput
        ref={inputRef}
        value={query}
        onChange={(event) => { setQuery(event.target.value); setActive(0); }}
        onKeyDown={onKeyDown}
        placeholder="Filter"
        aria-label="Filter this folder"
        aria-controls="folder-popover-list"
        aria-activedescendant={rows.length ? `folder-popover-row-${activeIndex}` : undefined}
        spellCheck={false}
        className={`${FIELD_COMPACT_CLASS} mx-1 my-1`}
      />
      <div id="folder-popover-list" role="listbox" aria-label={name} className="flex max-h-[min(22rem,50vh)] flex-col gap-px overflow-y-auto">
        {rows.map((row, index) => (
          <Button
            key={row.path}
            id={`folder-popover-row-${index}`}
            data-row={index}
            variant="menu-row"
            role="option"
            aria-selected={index === activeIndex}
            aria-current={row.path === currentPath ? "page" : undefined}
            tabIndex={-1}
            onClick={() => choose(index)}
            className={`${index === activeIndex ? ACTIVE_ROW : ""} ${row.path === currentPath ? "font-medium" : ""}`}
          >
            <span className={MENU_ICON_CLASS}>
              {row.kind === "folder" ? <HiOutlineFolder size={15} aria-hidden="true" /> : <HiOutlineDocumentText size={15} aria-hidden="true" />}
            </span>
            <span className="flex-1 truncate">{row.name}</span>
          </Button>
        ))}
        {!rows.length && (
          <p className="px-2.5 py-2 text-ui-footnote text-fg-faint">{query ? "No matches" : "Empty folder"}</p>
        )}
      </div>
      {actions.length > 0 && <div role="separator" className={MENU_SEPARATOR_CLASS} />}
      {actions.map((action, i) => (
        <Button
          key={`${i}:${action.label}`}
          variant="menu-row"
          onClick={() => { onClose(); action.run(); }}
        >
          <span className={MENU_ICON_CLASS}>{action.icon}</span>
          <span className="flex-1 truncate">{action.label}</span>
        </Button>
      ))}
    </div>,
    document.body,
  );
}
