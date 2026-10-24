"use client";

import React, { useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { HiOutlineDatabase, HiOutlineGlobeAlt, HiOutlineX } from "react-icons/hi";
import { TbPinned, TbPinnedOff } from "react-icons/tb";
import Button from "@/app/components/Button";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import { atom_recentVaultsDialogOpen } from "@/app/atoms/ui-atoms";
import { atom_vaultKey } from "@/app/atoms/vault-atoms";
import type { RecentVault } from "@/app/services/recent-vaults";
import { useRecentVaults } from "../hooks/use-recent-vaults";
import PinIconPopover from "./PinIconPopover";

// The drag's payload type: this list reorders with it, and nothing else does.
const DRAG_TYPE = "application/x-hermes-recent-vault";

// The vault switcher's recent vaults (useVaultMenuItems lists only the pinned
// ones): pin one to show it in the Vault menu (pinned vaults never age out), drag a
// row (or Alt+↑/↓ on it) to reorder within its group, click a row's leading
// icon to give the vault an emoji (PinIconPopover, straight away), remove one from the
// list (its files are untouched), or click a name to open that vault. The
// open vault is listed too, so it can be pinned. Each change is saved at
// once, on this device (services/recent-vaults.ts).
export default function RecentVaultsDialog() {
  const [isOpen, setIsOpen] = useAtom(atom_recentVaultsDialogOpen);
  const vaultKey = useAtomValue(atom_vaultKey);
  const { allRecentVaults: list, openRecentVault, forgetRecentVault, pinRecentVault, moveRecentVault, setRecentVaultIcon } = useRecentVaults();
  // The vault whose emoji is being picked, and its icon button.
  const [picker, setPicker] = useState<{ key: string; anchor: DOMRect } | null>(null);
  const pickerEntry = picker ? list.find((entry) => entry.key === picker.key) : undefined;
  const iconRef = useRef<HTMLElement | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  // The row being dragged and where it would land: an insertion point, 0
  // above the first row up to the count below the last.
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);

  const close = () => {
    setPicker(null);
    setIsOpen(false);
  };

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
          onClick={() => void open(entry)}
          onKeyDown={moveByKey(entry.key)}
          disabled={isOpenVault}
          title={isOpenVault ? "The open vault" : `Open ${entry.name}`}
        >
          <span className="min-w-0">
            <span className="block truncate">{entry.name}</span>
            <span className="block text-ui-caption text-fg-faint">
              {entry.kind === "local" ? "Folder on disk" : "In this browser"}
              {isOpenVault ? " · Open" : ""}
            </span>
          </span>
        </Button>
        <Button
          variant="icon"
          aria-label={entry.pinned ? `Unpin ${entry.name}` : `Pin ${entry.name}`}
          aria-pressed={!!entry.pinned}
          title={entry.pinned ? "Unpin" : "Pin to the top"}
          onClick={() => pinRecentVault(entry.key, !entry.pinned)}
          onKeyDown={moveByKey(entry.key)}
        >
          {entry.pinned ? <TbPinnedOff size={16} /> : <TbPinned size={16} />}
        </Button>
        <Button
          variant="icon"
          aria-label={`Remove ${entry.name} from recents`}
          title="Remove from recents"
          onClick={() => forgetRecentVault(entry.key)}
          onKeyDown={moveByKey(entry.key)}
        >
          <HiOutlineX size={16} />
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
            Pinned vaults are listed in the Vault menu. Drag to reorder, or press Alt+↑/↓.
            Removing a vault only takes it off this list; its notes are untouched.
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
