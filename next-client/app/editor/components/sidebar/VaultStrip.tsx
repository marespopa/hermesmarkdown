"use client";

import React, { useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { HiOutlineClock, HiOutlineCollection, HiOutlineDatabase, HiOutlineEmojiHappy, HiOutlinePlus, HiOutlineTrash } from "react-icons/hi";
import { TbPinned, TbPinnedOff } from "react-icons/tb";
import { atom_newVaultFlowOpen, atom_recentVaultsDialogOpen } from "@/app/atoms/ui-atoms";
import { atom_vaultKey } from "@/app/atoms/vault-atoms";
import Button from "@/app/components/Button";
import { useFileSystem } from "@/app/hooks/use-file-system";
import type { RecentVault } from "@/app/services/recent-vaults";
import { useRecentVaults } from "../../hooks/use-recent-vaults";
import PinIconPopover from "../PinIconPopover";
import { VAULT_STRIP_WIDTH } from "./vault-strip-width";
import TabContextMenu, { type TabContextMenuItem } from "../TabContextMenu";

const MENU_ICON = { size: 15 } as const;

// The vault strip: the sidebar's narrow rail of spaces. One icon per pinned
// vault plus the open one (its emoji, else its first letter); a click
// switches to it (the tabs, text and folded sections it was left with come
// back: services/vault-workspace.ts), a right-click opens its menu (Pin /
// Unpin, Set Icon…, Remove from Recents). The clicked icon is current at
// once while the vault opens (optimistic), and falls back to the open vault
// if it doesn't (openRecentVault says why with a toast). The + at the foot
// opens or creates a vault, or lists the recent ones.
export default function VaultStrip() {
  const vaultKey = useAtomValue(atom_vaultKey);
  const { allRecentVaults, openRecentVault, pinRecentVault, forgetRecentVault, setRecentVaultIcon } = useRecentVaults();
  const { openVault, isVaultSupported, isBrowserVaultSupported } = useFileSystem();
  const setNewVaultFlowOpen = useSetAtom(atom_newVaultFlowOpen);
  const setRecentVaultsDialogOpen = useSetAtom(atom_recentVaultsDialogOpen);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ entry: RecentVault; x: number; y: number } | null>(null);
  const [addMenu, setAddMenu] = useState<{ x: number; y: number } | null>(null);
  const [picker, setPicker] = useState<{ entry: RecentVault; anchor: DOMRect } | null>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const iconRefs = useRef(new Map<string, HTMLButtonElement>());

  const entries = allRecentVaults.filter((entry) => entry.pinned || entry.key === vaultKey);
  const currentKey = pendingKey ?? vaultKey;

  const switchTo = async (entry: RecentVault) => {
    if (entry.key === vaultKey || pendingKey) return;
    setPendingKey(entry.key);
    try {
      await openRecentVault(entry);
    } finally {
      setPendingKey(null);
    }
  };

  const entryItems = (entry: RecentVault): TabContextMenuItem[] => [
    {
      label: entry.pinned ? "Unpin" : "Pin",
      icon: entry.pinned ? <TbPinnedOff {...MENU_ICON} /> : <TbPinned {...MENU_ICON} />,
      onClick: () => pinRecentVault(entry.key, !entry.pinned),
    },
    {
      label: entry.icon ? "Change Icon…" : "Set Icon…",
      icon: <HiOutlineEmojiHappy {...MENU_ICON} />,
      onClick: () => {
        const anchor = iconRefs.current.get(entry.key)?.getBoundingClientRect();
        if (anchor) setPicker({ entry, anchor });
      },
    },
    { label: "Remove from Recents", icon: <HiOutlineTrash {...MENU_ICON} />, divider: true, onClick: () => forgetRecentVault(entry.key) },
  ];

  const addItems: TabContextMenuItem[] = [
    ...(isVaultSupported || isBrowserVaultSupported ? [
      { label: "Open Vault…", icon: <HiOutlineDatabase {...MENU_ICON} />, onClick: () => void openVault() },
      { label: "Create Vault…", icon: <HiOutlineCollection {...MENU_ICON} />, onClick: () => setNewVaultFlowOpen(true) },
    ] : []),
    ...(allRecentVaults.length > 0 ? [
      { label: "Recent Vaults…", icon: <HiOutlineClock {...MENU_ICON} />, divider: true, onClick: () => setRecentVaultsDialogOpen(true) },
    ] : []),
  ];

  return (
    <div role="toolbar" aria-label="Vaults" aria-orientation="vertical" style={{ width: VAULT_STRIP_WIDTH }} className="flex shrink-0 flex-col items-center gap-1 border-r border-edge-subtle py-2">
      {entries.map((entry) => {
        const isCurrent = entry.key === currentKey;
        const isOpening = entry.key === pendingKey;
        return (
          <Button
            key={entry.key}
            ref={(element) => {
              if (element) iconRefs.current.set(entry.key, element);
              else iconRefs.current.delete(entry.key);
            }}
            variant="unstyled"
            onClick={() => void switchTo(entry)}
            onContextMenu={(event: React.MouseEvent) => {
              event.preventDefault();
              setMenu({ entry, x: event.clientX, y: event.clientY });
            }}
            title={`${entry.name}${isCurrent ? "" : ": click to open, right-click for more"}`}
            aria-label={entry.name}
            aria-current={isCurrent ? "true" : undefined}
            aria-busy={isOpening || undefined}
            className={`relative flex h-8 w-8 items-center justify-center rounded-lg text-ui-footnote font-semibold select-none transition-[background-color,color,transform] duration-150 ease-out active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100 ${isCurrent ? "bg-fill text-fg" : "text-fg-faint hover:bg-fill hover:text-fg-muted"} ${isOpening ? "vault-opening" : ""}`}
          >
            <span
              aria-hidden="true"
              className={`absolute -left-1.5 w-0.5 rounded-full bg-fg-muted transition-[height,opacity] duration-200 ease-out motion-reduce:transition-none ${isCurrent ? "h-4 opacity-100" : "h-1.5 opacity-0"}`}
            />
            {entry.icon
              ? <span aria-hidden="true" className="text-[15px] leading-none">{entry.icon}</span>
              : <span aria-hidden="true">{entry.name.trim().charAt(0).toUpperCase() || "?"}</span>}
          </Button>
        );
      })}
      <Button
        ref={addRef}
        variant="unstyled"
        onClick={() => {
          const anchor = addRef.current?.getBoundingClientRect();
          setAddMenu((open) => (open || !anchor ? null : { x: anchor.right + 4, y: anchor.top }));
        }}
        disabled={addItems.length === 0}
        title="Open, create or switch vaults"
        aria-label="Add vault"
        aria-haspopup="menu"
        aria-expanded={!!addMenu}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-faint hover:bg-fill hover:text-fg-muted disabled:hover:bg-transparent"
      >
        <HiOutlinePlus size={15} aria-hidden="true" />
      </Button>
      {menu && (
        <TabContextMenu x={menu.x} y={menu.y} items={entryItems(menu.entry)} label={`${menu.entry.name} menu`} onClose={() => setMenu(null)} />
      )}
      {addMenu && (
        <TabContextMenu x={addMenu.x} y={addMenu.y} items={addItems} label="Vaults" anchorRef={addRef} onClose={() => setAddMenu(null)} />
      )}
      {picker && (
        <PinIconPopover
          anchor={picker.anchor}
          current={picker.entry.icon ?? null}
          onPick={async (icon) => {
            setRecentVaultIcon(picker.entry.key, icon);
            return true;
          }}
          onClose={() => setPicker(null)}
          label="Vault icon"
        />
      )}
    </div>
  );
}
