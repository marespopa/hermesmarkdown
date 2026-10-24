"use client";

import React, { useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { HiChevronDown, HiOutlinePencilAlt } from "react-icons/hi";
import { VscLayoutSidebarLeft } from "react-icons/vsc";
import { atom_vaultName } from "@/app/atoms/vault-atoms";
import Button from "@/app/components/Button";
import { formatShortcut, isMacPlatform } from "@/app/utils/platform";
import { PANE_HEADER_HEIGHT, PANE_ICON_SIZE } from "../pane-header-classes";
import PaneToolbarButton from "../PaneToolbarButton";
import TabContextMenu from "../TabContextMenu";
import { useVaultMenuItems } from "../../hooks/use-vault-menu-items";

// The sidebar's top bar, level with the pane toolbar: the vault switcher
// (the open vault's name; its menu lists the recent vaults, then Open /
// Create / Browser Vault, as the pane title's crumb does), New note and the
// button that hides the sidebar (the toolbar shows it again).
export default function SidebarHeader({ onNewNote, onHide }: { onNewNote: () => void; onHide: () => void }) {
  const vaultName = useAtomValue(atom_vaultName);
  const vaultItems = useVaultMenuItems();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const switcherRef = useRef<HTMLButtonElement>(null);
  const name = vaultName ?? "No vault";
  // The open vault is checked among the recent ones.
  const items = vaultItems.map((item) => (item.label === vaultName && !item.icon ? { ...item, checked: true } : item));

  return (
    <div className={`flex items-center gap-1 shrink-0 px-2 ${PANE_HEADER_HEIGHT}`}>
      <div className="flex-1 min-w-0">
        <Button
          ref={switcherRef}
          variant="unstyled"
          onClick={() => {
            const anchor = switcherRef.current?.getBoundingClientRect();
            setMenu((open) => (open || !anchor ? null : { x: anchor.left, y: anchor.bottom + 4 }));
          }}
          disabled={items.length === 0}
          title="Switch vault"
          aria-label={`Switch vault: ${name}`}
          aria-haspopup="menu"
          aria-expanded={!!menu}
          className={`flex h-7 max-w-full items-center gap-1 rounded-md px-2 text-ui-footnote font-semibold text-fg select-none hover:bg-fill disabled:hover:bg-transparent ${menu ? "bg-fill" : ""}`}
        >
          <span className="truncate">{name}</span>
          <HiChevronDown size={12} aria-hidden="true" className="shrink-0 text-fg-faint" />
        </Button>
      </div>
      <PaneToolbarButton
        icon={<HiOutlinePencilAlt size={PANE_ICON_SIZE} />}
        label="New note"
        shortcut={isMacPlatform() ? "⌃⌥N" : "Ctrl+Alt+N"}
        tooltipPosition="bottom-end"
        onClick={onNewNote}
        className="shrink-0"
      />
      {/* A plain icon button: alone, it needs no section capsule. */}
      <PaneToolbarButton
        icon={<VscLayoutSidebarLeft size={PANE_ICON_SIZE} />}
        label="Hide sidebar"
        shortcut={formatShortcut("\\")}
        tooltipPosition="bottom-end"
        onClick={onHide}
        className="shrink-0"
      />
      {menu && (
        <TabContextMenu
          x={menu.x}
          y={menu.y}
          items={items}
          label="Switch vault"
          anchorRef={switcherRef}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
