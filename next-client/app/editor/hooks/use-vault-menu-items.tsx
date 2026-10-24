"use client";

import React from "react";
import { useSetAtom } from "jotai";
import { HiOutlineClock, HiOutlineCollection, HiOutlineDatabase } from "react-icons/hi";
import { TbPinned } from "react-icons/tb";
import { atom_newVaultFlowOpen, atom_recentVaultsDialogOpen } from "@/app/atoms/ui-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useRecentVaults } from "./use-recent-vaults";
import type { TabContextMenuItem } from "../components/TabContextMenu";

const MENU_ICON = { size: 15 } as const;

// The vault switcher's items, shared by the pane title's "No vault" crumb
// and the vault root's folder list (FolderPopover): the pinned vaults (each
// led by its emoji, else the pin glyph), then
// Open / Create Vault wherever a vault can be kept (a folder on disk or
// browser storage: Create Vault asks which where both work, and Open Vault
// lists the browser vaults where folders can't be opened), then, set apart,
// Recent Vaults… (open, reorder, pin or remove
// any recent one) while there are any. Unpinned recents are only there, to
// keep the menu short. Empty when none of them is available.
export function useVaultMenuItems(): TabContextMenuItem[] {
  const { openVault, isVaultSupported, isBrowserVaultSupported } = useFileSystem();
  const { recentVaults, allRecentVaults, openRecentVault } = useRecentVaults();
  const setNewVaultFlowOpen = useSetAtom(atom_newVaultFlowOpen);
  const setRecentVaultsDialogOpen = useSetAtom(atom_recentVaultsDialogOpen);

  const actions: TabContextMenuItem[] = [
    ...(isVaultSupported || isBrowserVaultSupported ? [
      { label: "Open Vault…", icon: <HiOutlineDatabase {...MENU_ICON} />, onClick: () => void openVault() },
      { label: "Create Vault…", icon: <HiOutlineCollection {...MENU_ICON} />, onClick: () => setNewVaultFlowOpen(true) },
    ] : []),
    ...(allRecentVaults.length > 0 ? [
      // Its own group, apart from the ways to add a vault.
      { label: "Recent Vaults…", icon: <HiOutlineClock {...MENU_ICON} />, divider: true, onClick: () => setRecentVaultsDialogOpen(true) },
    ] : []),
  ];
  const pinned: TabContextMenuItem[] = recentVaults
    .filter((entry) => entry.pinned)
    .map((entry) => ({
      label: entry.name,
      // Its emoji, else the pin glyph, as the sidebar's Pinned rows lead.
      icon: entry.icon
        ? <span aria-hidden="true" className="text-[13px] leading-none">{entry.icon}</span>
        : <TbPinned {...MENU_ICON} aria-hidden="true" />,
      onClick: () => void openRecentVault(entry),
    }));
  return [
    ...pinned,
    ...actions.map((item, index) => (index === 0 && pinned.length > 0 ? { ...item, divider: true } : item)),
  ];
}
