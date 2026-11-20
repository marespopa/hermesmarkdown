"use client";

import React, { useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { HiOutlineDatabase, HiOutlineEmojiHappy, HiOutlineGlobeAlt, HiOutlineTrash } from "react-icons/hi";
import { TbPinned, TbPinnedOff } from "react-icons/tb";
import Button from "@/app/components/Button";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import { atom_recentVaultsDialogOpen } from "@/app/atoms/ui-atoms";
import { atom_vaultKey } from "@/app/atoms/vault-atoms";
import type { RecentVault } from "@/app/services/recent-vaults";
import { useRecentVaults } from "../hooks/use-recent-vaults";
import PinIconPopover from "./PinIconPopover";
import TabContextMenu, { type TabContextMenuItem } from "./TabContextMenu";

const MENU_ICON = { size: 15 } as const;

// The drag's payload type: this list reorders with it, and nothing else does.
const DRAG_TYPE = "application/x-hermes-recent-vault";

// The vault switcher's recent vaults (useVaultMenuItems lists only the pinned
// ones). A click or right-click on a vault's name opens its menu, like a
// file's: Open, Pin / Unpin (pinned vaults show in the Vault menu and never
// age out), Set Icon… (PinIconPopover), and Remove from Recents (its files
// are untouched). Drag a row (or Alt+↑/↓ on it) to reorder within its group,
// or click its leading icon to give the vault an emoji. The open vault is
// listed too, so it can be pinned. Each change is saved at once, on this
// device (services/recent-vaults.ts).
export default function RecentVaultsDialog() {
  const [isOpen, setIsOpen] = useAtom(atom_recentVaultsDialogOpen);
  const vaultKey = useAtomValue(atom_vaultKey);
  const { allRecentVaults: list, openRecentVault, forgetRecentVault, pinRecentVault, moveRecentVault, setRecentVaultIcon } = useRecentVaults();
  // The vault whose emoji is being picked, and its icon button.
  const [picker, setPicker] = useState<{ key: string; anchor: DOMRect } | null>(null);
  // The vault whose menu is open, and where.
  const [menu, setMenu] = useState<{ key: string; x: number; y: number } | null>(null);
  const menuEntry = menu ? list.find((entry) => entry.key === menu.key) : undefined;
  const pickerEntry = picker ? list.find((entry) => entry.key === picker.key) : undefined;
  const iconRef = useRef<HTMLElement | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  // The row being dragged and where it would land: an insertion point, 0
  // above the first row up to the count below the last.
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);

  const close = () => {
    setPicker(null);
    setMenu(null);
    setIsOpen(false);
  };

  // A click or right-click on the name (or the menu key: no pointer, so under the row).
  const openMenuAt = (key: string) => (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    const rect = (rowRefs.current.get(key) ?? event.currentTarget).getBoundingClientRect();
    const fromKeyboard = event.clientX === 0 && event.clientY === 0;
    setPicker(null);
    setMenu((open) => (open?.key === key && event.type === "click" ? null : { key, x: fromKeyboard ? rect.left + 8 : event.clientX, y: fromKeyboard ? rect.bottom : event.clientY }));
  };

  const menuItems = (entry: RecentVault): TabContextMenuItem[] => [
    {
      label: "Open Vault",
      icon: <HiOutlineDatabase {...MENU_ICON} />,
      disabled: entry.key === vaultKey,
      onClick: () => void open(entry),
    },
    {
      label: entry.pinned ? "Unpin" : "Pin",
      icon: entry.pinned ? <TbPinnedOff {...MENU_ICON} /> : <TbPinned {...MENU_ICON} />,
      onClick: () => pinRecentVault(entry.key, !entry.pinned),
    },
    {
      label: entry.icon ? "Change Icon…" : "Set Icon…",
      icon: <HiOutlineEmojiHappy {...MENU_ICON} />,
      onClick: () => {
        const rect = rowRefs.current.get(entry.key)?.getBoundingClientRect();
        if (rect) setPicker({ key: entry.key, anchor: rect });
      },
    },
    { label: "Remove from Recents", icon: <HiOutlineTrash {...MENU_ICON} />, divider: true, onClick: () => forgetRecentVault(entry.key) },
  ];

  const indexAt = (clientY: number) => {
    const index = list.findIndex((entry) => {
      const rect = rowRefs.current.get(entry.key)?.getBoundingClientRect();
      return !!rect && clientY < rect.top + rect.height / 2;
    });
    return index === -1 ? list.length : index;
  };

  const endDrag = () => {
    setDragging(null);
    setDropAt(null);
  };

  const moveByKey = (key: string) => (event: React.KeyboardEvent) => {
    if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
    event.preventDefault();
    const from = list.findIndex((entry) => entry.key === key);
    moveRecentVault(key, from + (event.key === "ArrowUp" ? -1 : 1));
  };

  const open = async (entry: RecentVault) => {
    if (await openRecentVault(entry)) close();
  };

  const row = (entry: RecentVault, index: number) => {
    const isOpenVault = entry.key === vaultKey;
    return (
      <div
        key={entry.key}
        role="listitem"
        ref={(element) => {
          if (element) rowRefs.current.set(entry.key, element);
          else rowRefs.current.delete(entry.key);
        }}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData(DRAG_TYPE, entry.key);
          event.dataTransfer.effectAllowed = "move";
          setDragging(entry.key);
        }}
        onDragEnd={endDrag}
        className={`relative flex items-center gap-1 pr-2 border-b border-edge last:border-b-0 ${dragging === entry.key ? "opacity-50" : ""}`}
      >
        {dropAt !== null && (dropAt === index || (dropAt === index + 1 && index === list.length - 1)) && (
          <span aria-hidden="true" className={`pointer-events-none absolute inset-x-2 h-0.5 rounded-full bg-fg-faint ${dropAt === index ? "-top-px" : "-bottom-px"}`} />
        )}
        {/* The vault's emoji, else its pin or where it lives; a click picks the emoji. */}
        <Button
          variant="icon"
          aria-label={entry.icon ? `Change icon of ${entry.name}` : `Add icon to ${entry.name}`}
          title={entry.icon ? "Change icon" : "Add icon"}
          aria-haspopup="dialog"
          aria-expanded={picker?.key === entry.key}
          onClick={(event) => {
            if (picker?.key === entry.key) {
              setPicker(null);
              return;
            }
            iconRef.current = event.currentTarget;
            setPicker({ key: entry.key, anchor: event.currentTarget.getBoundingClientRect() });
          }}
          onKeyDown={moveByKey(entry.key)}
          className="ml-1 shrink-0"
        >
          {entry.icon
            ? <span aria-hidden="true" className="text-[15px] leading-none">{entry.icon}</span>
            : entry.pinned
            ? <TbPinned size={16} aria-hidden="true" />
            : entry.kind === "local" ? <HiOutlineDatabase size={16} aria-hidden="true" /> : <HiOutlineGlobeAlt size={16} aria-hidden="true" />}
        </Button>
        <Button
          variant="menu-item"
          className="rounded-none text-left flex-1 min-w-0"
          onClick={openMenuAt(entry.key)}
          onContextMenu={openMenuAt(entry.key)}
          onKeyDown={moveByKey(entry.key)}
          aria-haspopup="menu"
          aria-expanded={menu?.key === entry.key}
          title={`${entry.name}: Open, Pin…`}
        >
          <span className="min-w-0">
            <span className="block truncate">{entry.name}</span>
            <span className="block text-ui-caption text-fg-faint">
              {entry.kind === "local" ? "Folder on disk" : "In this browser"}
              {isOpenVault ? " · Open" : ""}
            </span>
          </span>
        </Button>
      </div>
    );
  };

  return (
    <DialogModal isOpened={isOpen} onClose={close} styles="!max-w-md" ariaLabelledBy="recent-vaults-title" mobileSheet>
      <div className="space-y-4">
        <div>
          <h2 id="recent-vaults-title" className="text-ui-title-3 font-bold">Recent Vaults</h2>
          <p className="mt-1 text-ui-footnote text-fg-muted">
            Click a vault for its menu: Open, Pin or Unpin, Set Icon, Remove. Pinned vaults are listed in the Vault menu.
            Drag to reorder, or press Alt+↑/↓. Removing a vault only takes it off this list; its notes are untouched.
          </p>
        </div>
        <div
          role="list"
          aria-label="Recent vaults"
          className="max-h-80 overflow-y-auto rounded-xl border border-edge"
          onDragOver={(event) => {
            if (!dragging) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setDropAt(indexAt(event.clientY));
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropAt(null);
          }}
          onDrop={(event) => {
            if (!dragging) return;
            event.preventDefault();
            const at = indexAt(event.clientY);
            const from = list.findIndex((entry) => entry.key === dragging);
            moveRecentVault(dragging, at > from ? at - 1 : at);
            endDrag();
          }}
        >
          {list.length === 0
            ? <p className="p-4 text-ui-footnote text-fg-muted">No recent vaults.</p>
            : list.map(row)}
        </div>
      </div>
      {menu && menuEntry && (
        <TabContextMenu
          x={menu.x}
          y={menu.y}
          items={menuItems(menuEntry)}
          label={`${menuEntry.name} menu`}
          onClose={() => setMenu(null)}
          overDialog
        />
      )}
      {picker && pickerEntry && (
        <PinIconPopover
          anchor={picker.anchor}
          current={pickerEntry.icon ?? null}
          onPick={async (icon) => {
            setRecentVaultIcon(pickerEntry.key, icon);
            return true;
          }}
          onClose={() => setPicker(null)}
          anchorRef={iconRef}
          label="Vault icon"
          overDialog
        />
      )}
    </DialogModal>
  );
}
