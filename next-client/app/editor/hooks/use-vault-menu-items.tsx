"use client";

import React from "react";
import { useSetAtom } from "jotai";
import { HiOutlineCollection, HiOutlineDatabase, HiOutlineGlobeAlt } from "react-icons/hi";
import { atom_browserVaultDialogOpen, atom_newVaultFlowOpen } from "@/app/atoms/ui-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useRecentVaults } from "./use-recent-vaults";
import type { TabContextMenuItem } from "../components/TabContextMenu";

const MENU_ICON = { size: 15 } as const;

// The vault switcher's items, shared by the pane title's "No vault" crumb
// and the vault root's folder list (FolderPopover): recent vaults, then Open / Create Vault
// where disk folder access exists and Browser Vault where browser storage
// does. Empty when none of them is available.
export function useVaultMenuItems(): TabContextMenuItem[] {
  const { openVault, isVaultSupported, isBrowserVaultSupported } = useFileSystem();
  const { recentVaults, openRecentVault } = useRecentVaults();
  const setNewVaultFlowOpen = useSetAtom(atom_newVaultFlowOpen);
  const setBrowserVaultDialogOpen = useSetAtom(atom_browserVaultDialogOpen);

  const actions: TabContextMenuItem[] = [
    ...(isVaultSupported ? [
      { label: "Open Vault…", icon: <HiOutlineDatabase {...MENU_ICON} />, onClick: () => void openVault() },
      { label: "Create Vault…", icon: <HiOutlineCollection {...MENU_ICON} />, onClick: () => setNewVaultFlowOpen(true) },
    ] : []),
    ...(isBrowserVaultSupported ? [
      { label: "Browser Vault…", icon: <HiOutlineGlobeAlt {...MENU_ICON} />, onClick: () => setBrowserVaultDialogOpen(true) },
    ] : []),
  ];
  return [
    ...recentVaults.map((entry) => ({ label: entry.name, onClick: () => void openRecentVault(entry) })),
    ...actions.map((item, index) => (index === 0 && recentVaults.length > 0 ? { ...item, divider: true } : item)),
  ];
}
