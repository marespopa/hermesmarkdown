"use client";

import React, { useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { HiChevronDown, HiOutlineCollection, HiOutlineDatabase, HiOutlineGlobeAlt, HiOutlinePencilAlt } from "react-icons/hi";
import { VscLayoutSidebarLeft } from "react-icons/vsc";
import { atom_browserVaultDialogOpen, atom_newVaultFlowOpen } from "@/app/atoms/ui-atoms";
import { atom_vaultName } from "@/app/atoms/vault-atoms";
import Button from "@/app/components/Button";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { formatShortcut, isMacPlatform } from "@/app/utils/platform";
import { useRecentVaults } from "../../hooks/use-recent-vaults";
import { PANE_HEADER_HEIGHT, PANE_ICON_SIZE } from "../pane-header-classes";
import PaneToolbarButton from "../PaneToolbarButton";
import TabContextMenu, { type TabContextMenuItem } from "../TabContextMenu";

const MENU_ICON = { size: 15 } as const;

// The sidebar's top bar, level with the pane toolbar: the vault's name, in
// sentence case as a window title, as a switcher (recent vaults, then open / create / browser vault), New note
// and the button that hides the sidebar (the toolbar shows it again).
export default function SidebarHeader({ onNewNote, onHide }: { onNewNote: () => void; onHide: () => void }) {
  const vaultName = useAtomValue(atom_vaultName);
  const { openVault, isVaultSupported, isBrowserVaultSupported } = useFileSystem();
  const { recentVaults, openRecentVault } = useRecentVaults();
  const setNewVaultFlowOpen = useSetAtom(atom_newVaultFlowOpen);
  const setBrowserVaultDialogOpen = useSetAtom(atom_browserVaultDialogOpen);
  const switcherRef = useRef<HTMLButtonElement>(null);
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);

  const actions: TabContextMenuItem[] = [
    ...(isVaultSupported ? [
      { label: "Open Vault…", icon: <HiOutlineDatabase {...MENU_ICON} />, onClick: () => void openVault() },
      { label: "Create Vault…", icon: <HiOutlineCollection {...MENU_ICON} />, onClick: () => setNewVaultFlowOpen(true) },
    ] : []),
    ...(isBrowserVaultSupported ? [
      { label: "Browser Vault…", icon: <HiOutlineGlobeAlt {...MENU_ICON} />, onClick: () => setBrowserVaultDialogOpen(true) },
    ] : []),
  ];
  const items: TabContextMenuItem[] = [
    ...recentVaults.map((entry) => ({ label: entry.name, onClick: () => void openRecentVault(entry) })),
    ...actions.map((item, index) => (index === 0 && recentVaults.length > 0 ? { ...item, divider: true } : item)),
  ];

  return (
    <div className={`flex items-center gap-1 shrink-0 px-2 ${PANE_HEADER_HEIGHT}`}>
      <Button
        ref={switcherRef}
        variant="unstyled"
        aria-haspopup="menu"
        aria-expanded={!!menuAt}
        aria-label={`Vault: ${vaultName ?? "none"}. Switch vault`}
        disabled={items.length === 0}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setMenuAt(menuAt ? null : { x: rect.left, y: rect.bottom + 4 });
        }}
        className="flex flex-1 min-w-0 items-center gap-1 h-7 px-2 rounded-md text-ui-footnote font-semibold text-fg hover:bg-fill select-none disabled:hover:bg-transparent"
      >
        <span className="min-w-0 truncate">{vaultName ?? "Workspace"}</span>
        {items.length > 0 && <HiChevronDown size={11} aria-hidden="true" className="shrink-0 text-fg-faint" />}
      </Button>
      {menuAt && (
        <TabContextMenu x={menuAt.x} y={menuAt.y} label="Switch vault" anchorRef={switcherRef} onClose={() => setMenuAt(null)} items={items} />
      )}
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
    </div>
  );
}
