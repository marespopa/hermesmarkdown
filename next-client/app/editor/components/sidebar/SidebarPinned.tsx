"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { HiOutlineEmojiHappy } from "react-icons/hi";
import { TbPinned } from "react-icons/tb";
import Button from "@/app/components/Button";
import { useAtomValue, useSetAtom } from "jotai";
import { atom_showFolderInFiles, atom_vaultName } from "@/app/atoms/vault-atoms";
import { atom_sidebarOpen } from "@/app/atoms/ui-atoms";
import { usePins } from "@/app/hooks/use-pins";
import { formatShortcut } from "@/app/utils/platform";
import FolderPopover from "../FolderPopover";
import PinIconPopover from "../PinIconPopover";
import { useFolderCreateActions } from "../../hooks/use-folder-create-actions";
import TabContextMenu, { type TabContextMenuItem } from "../TabContextMenu";
import { pinGlyph } from "./pinned-pages";
import SidebarSection from "./SidebarSection";
import { SIDEBAR_ITEM_CURRENT_CLASS, SIDEBAR_ITEM_IDLE_CLASS } from "./sidebar-classes";
import { usePinnedRows, type PinnedRow } from "./use-pinned-rows";
import { useSidebarNavigation } from "./use-sidebar-navigation";

const MENU_ICON = { size: 15, "aria-hidden": true } as const;

// A sidebar row (sidebar-classes.ts) without its padding: the icon and the
// label are two buttons inside it, each padded on its own.
const SIDEBAR_ROW_CLASS = "flex items-center h-7 rounded-md text-ui-footnote transition-colors";

// The vault's pins (kept on this device, pin-atoms.ts), the first section of the sidebar:
// notes, folders, tags and app pages, in the file's order (usePinnedRows).
// Each row leads with its emoji icon (shown only here) or its kind's glyph;
// a click on the label opens it, and the current one is highlighted. A click
// on the icon opens the emoji picker straight away (PinIconPopover; with no
// emoji, the glyph turns into a smiley on hover), as the sidebar header's
// vault icon does. A right-click or the menu key opens its menu: Set / Change
// Icon… and Unpin. A pinned folder opens the breadcrumb's folder list
// (FolderPopover) under its row, a click or its Ctrl/Cmd+number again
// closing it; the list's Show in Files reveals it in the tree. Dragging a row (or
// Alt+↑/↓ on it) reorders the pins. At most nine are listed (PINS_MAX), each
// opened by Ctrl/Cmd+1–9 from anywhere, its key shown at the row's end.
// Pinning itself is done elsewhere (the Files and note menus, the palette,
// the Tags page, Pin Page to Sidebar…). Each change is saved at once, on
// this device (pin-atoms.ts). A pin whose note or folder is gone shows
// faint. With no pins it renders nothing. `activePath` is the note in front
// on the editor (null elsewhere).
// The drag's payload type: this list reorders with it, and nothing else does.
const DRAG_TYPE = "application/x-hermes-pin";

export default function SidebarPinned({ activePath }: { activePath: string | null }) {
  const rows = usePinnedRows(activePath);
  const { unpin, setIcon, move } = usePins();
  const [menu, setMenu] = useState<{ x: number; y: number; key: string; align: "start" | "end" } | null>(null);
  const [picker, setPicker] = useState<{ key: string; anchor: DOMRect } | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  // The icon button the picker opened from: a second click on it closes it.
  const pickerButtonRef = useRef<HTMLButtonElement | null>(null);
  // The row being dragged and where it would land: an insertion point, 0
  // above the first row up to the count below the last.
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  // The pinned folder whose list is open, under its row.
  const [folderMenu, setFolderMenu] = useState<{ key: string; folder: string; anchor: DOMRect } | null>(null);
  const vaultName = useAtomValue(atom_vaultName) ?? "Vault";
  const showFolderInFiles = useSetAtom(atom_showFolderInFiles);
  // Hidden, its rows are out of sight: a folder's list opens centred.
  const sidebarOpen = useAtomValue(atom_sidebarOpen);
  const { openHandle, toEditor } = useSidebarNavigation();
  const { newNoteIn, newFolderIn } = useFolderCreateActions();

  // A click (or Ctrl/Cmd+number): a folder toggles its list, the rest open.
  const activate = useCallback((row: PinnedRow) => {
    const rect = rowRefs.current.get(row.key)?.getBoundingClientRect();
    if (row.pin.kind !== "folder" || row.missing || !rect) return row.open();
    const folder = row.pin.target;
    setFolderMenu((open) => (open?.key === row.key ? null : { key: row.key, folder, anchor: rect }));
  }, []);

  const listed = rows.map((row) => row.key);

  // The insertion point under the pointer: before the first row whose middle
  // is below it, else after the last (so the title above means the top).
  const indexAt = (clientY: number) => {
    const index = rows.findIndex((row) => {
      const rect = rowRefs.current.get(row.key)?.getBoundingClientRect();
      return !!rect && clientY < rect.top + rect.height / 2;
    });
    return index === -1 ? rows.length : index;
  };

  // Ctrl/Cmd+1–9 opens the pin in that place (at most nine are listed),
  // from anywhere in the window, the editor included.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // A dialog or picker that numbers its own rows (TemplatePicker) handled it first.
      if (event.defaultPrevented || !(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey || !/^[1-9]$/.test(event.key)) return;
      const row = rows[Number(event.key) - 1];
      if (!row) return;
      event.preventDefault();
      activate(row);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [rows, activate]);

  if (!rows.length) return null;

  const menuRow = menu ? rows.find((row) => row.key === menu.key) : undefined;
  const pickerRow = picker ? rows.find((row) => row.key === picker.key) : undefined;


  const endDrag = () => {
    setDragging(null);
    setDropAt(null);
  };

  // The whole section takes a dragged row's drop, title and gaps included.
  const drop = (event: React.DragEvent) => {
    if (dragging) {
      const at = indexAt(event.clientY);
      const from = listed.indexOf(dragging);
      void move(dragging, at > from ? at - 1 : at, listed);
    }
    endDrag();
  };

  const dropTarget = {
    onDragOver: (event: React.DragEvent) => {
      if (!dragging) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDropAt(indexAt(event.clientY));
    },
    onDragLeave: (event: React.DragEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropAt(null);
    },
    onDrop: (event: React.DragEvent) => {
      if (!dragging) return;
      event.preventDefault();
      drop(event);
    },
  };

  if (!rows.length) return <SidebarSection title="Pinned">{null}</SidebarSection>;

  // A right-click (or the menu key: no pointer, so under the row) opens it too.
  const openMenuAt = (key: string) => (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    const rect = (rowRefs.current.get(key) ?? event.currentTarget).getBoundingClientRect();
    const fromKeyboard = event.clientX === 0 && event.clientY === 0;
    menuButtonRef.current = null;
    setMenu({ x: fromKeyboard ? rect.left + 8 : event.clientX, y: fromKeyboard ? rect.bottom : event.clientY, key, align: "start" });
  };

  // Alt+↑/↓ on either of a row's buttons moves it one place (none past the ends).
  const moveByKey = (key: string) => (event: React.KeyboardEvent) => {
    if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
    event.preventDefault();
    const to = listed.indexOf(key) + (event.key === "ArrowUp" ? -1 : 1);
    if (to >= 0 && to < listed.length) void move(key, to, listed);
  };

  const menuItems = (row: PinnedRow): TabContextMenuItem[] => [
    {
      label: row.pin.icon ? "Change Icon…" : "Set Icon…",
      icon: <HiOutlineEmojiHappy {...MENU_ICON} />,
      onClick: () => {
        const rect = rowRefs.current.get(row.key)?.getBoundingClientRect();
        if (rect) setPicker({ key: row.key, anchor: rect });
      },
    },
    { label: "Unpin", icon: <TbPinned {...MENU_ICON} />, divider: true, onClick: () => void unpin(row.key) },
  ];

  return (
    <div {...dropTarget}>
      <SidebarSection title="Pinned">
        <div role="list" aria-label="Pinned" className="flex flex-col gap-px">
          {rows.map((row, index) => (
            <div
              key={row.key}
              role="listitem"
              ref={(element) => {
                if (element) rowRefs.current.set(row.key, element);
                else rowRefs.current.delete(row.key);
              }}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData(DRAG_TYPE, row.key);
                event.dataTransfer.effectAllowed = "move";
                setDragging(row.key);
              }}
              onDragEnd={endDrag}
              className={`relative ${SIDEBAR_ROW_CLASS} ${row.current || folderMenu?.key === row.key ? SIDEBAR_ITEM_CURRENT_CLASS : SIDEBAR_ITEM_IDLE_CLASS} ${dragging === row.key ? "opacity-50" : ""}`}
            >
              {dropAt !== null && (dropAt === index || (dropAt === index + 1 && index === rows.length - 1)) && (
                <span aria-hidden="true" className={`pointer-events-none absolute inset-x-1 h-0.5 rounded-full bg-fg-faint ${dropAt === index ? "-top-px" : "-bottom-px"}`} />
              )}
              {/* The icon opens the emoji picker. */}
              <Button
                variant="unstyled"
                aria-label={row.pin.icon ? `Change icon of ${row.label}` : `Add icon to ${row.label}`}
                aria-haspopup="dialog"
                aria-expanded={picker?.key === row.key}
                title={row.pin.icon ? "Change icon" : "Add icon"}
                onClick={(event) => {
                  if (picker?.key === row.key) {
                    setPicker(null);
                    return;
                  }
                  const rect = rowRefs.current.get(row.key)?.getBoundingClientRect();
                  pickerButtonRef.current = event.currentTarget;
                  if (rect) setPicker({ key: row.key, anchor: rect });
                }}
                onContextMenu={openMenuAt(row.key)}
                onKeyDown={moveByKey(row.key)}
                className="group flex h-5 shrink-0 items-center justify-center pl-2 pr-1.5"
              >
                <span className="flex w-[15px] items-center justify-center">
                  {row.pin.icon ? (
                    <span aria-hidden="true" className="text-[13px] leading-none">{row.pin.icon}</span>
                  ) : (
                    <>
                      <span className="flex group-hover:hidden group-focus-visible:hidden">{pinGlyph(row.pin)}</span>
                      <HiOutlineEmojiHappy {...MENU_ICON} className="hidden group-hover:block group-focus-visible:block" />
                    </>
                  )}
                </span>
              </Button>
              <Button
                variant="unstyled"
                onClick={() => activate(row)}
                // The open folder list's own outside-press would close it
                // before this click toggles it: the click closes it instead.
                onMouseDown={(event) => { if (folderMenu?.key === row.key) event.stopPropagation(); }}
                aria-haspopup={row.pin.kind === "folder" ? "dialog" : undefined}
                aria-expanded={row.pin.kind === "folder" ? folderMenu?.key === row.key : undefined}
                onContextMenu={openMenuAt(row.key)}
                onKeyDown={moveByKey(row.key)}
                aria-current={row.current ? "page" : undefined}
                aria-busy={row.opening || undefined}
                aria-keyshortcuts={`Control+${index + 1} Meta+${index + 1}`}
                title={row.missing ? "Not found in this vault" : row.title}
                className="flex h-full min-w-0 flex-1 items-center gap-2 pl-1.5 pr-2 text-left"
              >
                <span className={`min-w-0 flex-1 truncate ${row.missing ? "text-fg-faint" : ""}`}>{row.label}</span>
                {row.opening ? (
                  // After a moment (a quick open shows only the highlight).
                  <span aria-hidden="true" className="loading-bar-appear flex h-3 w-3 shrink-0 items-center justify-center">
                    <span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-fg-faint border-t-transparent motion-reduce:animate-none" />
                  </span>
                ) : (
                  <kbd aria-hidden="true" className="shrink-0 font-mono text-[10px] text-fg-faint [@media(hover:none)]:hidden">
                    {formatShortcut(String(index + 1))}
                  </kbd>
                )}
              </Button>
            </div>
          ))}
        </div>
        {menu && menuRow && (
          <TabContextMenu
            x={menu.x}
            y={menu.y}
            align={menu.align}
            label={`${menuRow.label} actions`}
            anchorRef={menuButtonRef}
            items={menuItems(menuRow)}
            onClose={() => setMenu(null)}
          />
        )}
        {folderMenu && (
          <FolderPopover
            folder={folderMenu.folder}
            anchor={folderMenu.anchor}
            currentPath={activePath}
            rootName={vaultName}
            onOpenNote={(handle, path) => void openHandle(handle, path)}
            onNewNote={(folder, name) => void newNoteIn(folder, name).then(() => toEditor())}
            onNewFolder={newFolderIn}
            onShowInFiles={(folder) => showFolderInFiles(folder)}
            onClose={() => setFolderMenu(null)}
            centered={!sidebarOpen}
          />
        )}
        {picker && pickerRow && (
          <PinIconPopover
            anchor={picker.anchor}
            current={pickerRow.pin.icon}
            onPick={async (icon) => {
              const result = await setIcon(pickerRow.key, icon);
              return result === "ok" || result === "unchanged";
            }}
            onClose={() => setPicker(null)}
            anchorRef={pickerButtonRef}
          />
        )}
      </SidebarSection>
    </div>
  );
}
