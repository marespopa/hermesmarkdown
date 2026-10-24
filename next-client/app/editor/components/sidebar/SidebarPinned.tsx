"use client";

import React, { useEffect, useRef, useState } from "react";
import { HiOutlineEmojiHappy } from "react-icons/hi";
import { TbPinned } from "react-icons/tb";
import Button from "@/app/components/Button";
import { useAtomValue } from "jotai";
import { atom_pinsState } from "@/app/atoms/pin-atoms";
import { usePins } from "@/app/hooks/use-pins";
import { formatShortcut } from "@/app/utils/platform";
import PinIconPopover from "../PinIconPopover";
import TabContextMenu, { type TabContextMenuItem } from "../TabContextMenu";
import { pinGlyph } from "./pinned-pages";
import SidebarSection from "./SidebarSection";
import { SIDEBAR_ITEM_CURRENT_CLASS, SIDEBAR_ITEM_IDLE_CLASS } from "./sidebar-classes";
import { usePinnedRows, type PinnedRow } from "./use-pinned-rows";

const MENU_ICON = { size: 15, "aria-hidden": true } as const;

// A sidebar row (sidebar-classes.ts) without its padding: the icon and the
// label are two buttons inside it, each padded on its own.
const SIDEBAR_ROW_CLASS = "flex items-center h-7 rounded-md text-ui-footnote transition-colors";

// The vault's pins (`.hermes/pins.yaml`), the first section of the sidebar:
// notes, folders, tags and app pages, in the file's order (usePinnedRows).
// Each row leads with its emoji icon (shown only here) or its kind's glyph;
// a click on the label opens it, and the current one is highlighted. A click
// on the icon, a right-click or the menu key opens its menu: Set / Change
// Icon… (the emoji picker, PinIconPopover) and Unpin. Dragging a row (or
// Alt+↑/↓ on it) reorders the pins. At most nine are listed (PINS_MAX), each
// opened by Ctrl/Cmd+1–9 from anywhere, its key shown at the row's end.
// Pinning itself is done elsewhere (the Files and note menus, the palette,
// the Tags page, Pin Page to Sidebar…). Each change is written to the file
// at once. A pin whose note or folder is gone shows faint. With no pins
// listed it renders nothing, except its header alone while a vault's pins
// are read for the first time on this device (after that they show at once
// from usePinsSync's cache). `activePath` is the note in front
// on the editor (null elsewhere).
// The drag's payload type: this list reorders with it, and nothing else does.
const DRAG_TYPE = "application/x-hermes-pin";

export default function SidebarPinned({ activePath }: { activePath: string | null }) {
  const rows = usePinnedRows(activePath);
  // The first read of a vault this device hasn't cached pins for: the header
  // shows at once, the rows when the file is read.
  const pinsState = useAtomValue(atom_pinsState);
  const firstLoad = pinsState.status === "loading" && !pinsState.cached;
  const { unpin, setIcon, move } = usePins();
  const [menu, setMenu] = useState<{ x: number; y: number; key: string; align: "start" | "end" } | null>(null);
  const [picker, setPicker] = useState<{ key: string; anchor: DOMRect } | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  // The row being dragged and where it would land: an insertion point, 0
  // above the first row up to the count below the last.
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);

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
      row.open();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [rows]);

  if (!rows.length && !firstLoad) return null;

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
              className={`relative ${SIDEBAR_ROW_CLASS} ${row.current ? SIDEBAR_ITEM_CURRENT_CLASS : SIDEBAR_ITEM_IDLE_CLASS} ${dragging === row.key ? "opacity-50" : ""}`}
            >
              {dropAt !== null && (dropAt === index || (dropAt === index + 1 && index === rows.length - 1)) && (
                <span aria-hidden="true" className={`pointer-events-none absolute inset-x-1 h-0.5 rounded-full bg-fg-faint ${dropAt === index ? "-top-px" : "-bottom-px"}`} />
              )}
              {/* The icon opens the row's menu. */}
              <Button
                variant="unstyled"
                aria-label={`${row.label} actions`}
                aria-haspopup="menu"
                aria-expanded={menu?.key === row.key}
                title={`${row.label} actions`}
                onClick={(event) => {
                  if (menu?.key === row.key) {
                    setMenu(null);
                    return;
                  }
                  const rect = event.currentTarget.getBoundingClientRect();
                  menuButtonRef.current = event.currentTarget;
                  setMenu({ x: rect.left, y: rect.bottom + 4, key: row.key, align: "start" });
                }}
                onContextMenu={openMenuAt(row.key)}
                onKeyDown={moveByKey(row.key)}
                className="flex h-5 shrink-0 items-center justify-center pl-2 pr-1.5"
              >
                <span className="flex w-[15px] items-center justify-center">
                  {row.pin.icon ? <span aria-hidden="true" className="text-[13px] leading-none">{row.pin.icon}</span> : pinGlyph(row.pin)}
                </span>
              </Button>
              <Button
                variant="unstyled"
                onClick={row.open}
                onContextMenu={openMenuAt(row.key)}
                onKeyDown={moveByKey(row.key)}
                aria-current={row.current ? "page" : undefined}
                aria-keyshortcuts={`Control+${index + 1} Meta+${index + 1}`}
                title={row.missing ? "Not found in this vault" : row.title}
                className="flex h-full min-w-0 flex-1 items-center gap-2 pl-1.5 pr-2 text-left"
              >
                <span className={`min-w-0 flex-1 truncate ${row.missing ? "text-fg-faint" : ""}`}>{row.label}</span>
                <kbd aria-hidden="true" className="shrink-0 font-mono text-[10px] text-fg-faint [@media(hover:none)]:hidden">
                  {formatShortcut(String(index + 1))}
                </kbd>
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
        {picker && pickerRow && (
          <PinIconPopover
            anchor={picker.anchor}
            current={pickerRow.pin.icon}
            onPick={async (icon) => {
              const result = await setIcon(pickerRow.key, icon);
              return result === "ok" || result === "unchanged";
            }}
            onClose={() => setPicker(null)}
          />
        )}
      </SidebarSection>
    </div>
  );
}
