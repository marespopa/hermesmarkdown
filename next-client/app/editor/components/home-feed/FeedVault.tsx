"use client";

import { useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { FaGithub } from "react-icons/fa";
import {
  HiChevronDown,
  HiOutlineCollection,
  HiOutlineDatabase,
  HiOutlineFolder,
  HiOutlineFolderOpen,
  HiOutlineGlobeAlt,
  HiOutlineLogout,
  HiOutlineRefresh,
} from "react-icons/hi";
import { atom_vaultDescriptor, atom_vaultHandle, type VaultDescriptor } from "@/app/atoms/vault-atoms";
import { atom_browserVaultDialogOpen, atom_newVaultFlowOpen, atom_showHiddenFiles } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import { useDialog } from "@/app/hooks/use-dialog";
import { useFileSystem } from "@/app/hooks/use-file-system";
import type { RecentVault } from "@/app/services/recent-vaults";
import { useRecentVaults } from "../../hooks/use-recent-vaults";
import TabContextMenu, { type TabContextMenuItem } from "../TabContextMenu";

export const VAULT_KIND_LABEL: Record<VaultDescriptor["kind"], string> = {
  local: "Folder on this device",
  browser: "Stored in this browser",
  github: "GitHub",
};

export function VaultKindIcon({ kind, size = 15 }: { kind: RecentVault["kind"]; size?: number }) {
  if (kind === "browser") return <HiOutlineGlobeAlt size={size} aria-hidden="true" />;
  if (kind === "github") return <FaGithub size={size} aria-hidden="true" />;
  return <HiOutlineFolder size={size} aria-hidden="true" />;
}

// The vault's own name: browser and GitHub vaults carry a display name
// (their handle is an internal workspace folder); a local vault is its folder.
export function vaultDisplayName(descriptor: VaultDescriptor | null, handleName: string): string {
  if (descriptor && descriptor.kind !== "local" && descriptor.displayName) return descriptor.displayName;
  return handleName;
}

/** Recent vaults in the menu; the no-vault start screen lists them all. */
export const MENU_RECENT_LIMIT = 5;

// The bar at the top of the feed: which vault it's showing and where it
// lives. The name opens the one vault menu: the newest recent vaults, then
// open / create / browser vaults, then refresh and close (after a confirm).
// Closing leaves the feed open, now as the no-vault start.
export default function FeedVault() {
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const descriptor = useAtomValue(atom_vaultDescriptor);
  const showHiddenFiles = useAtomValue(atom_showHiddenFiles);
  const setNewVaultFlowOpen = useSetAtom(atom_newVaultFlowOpen);
  const setBrowserVaultDialogOpen = useSetAtom(atom_browserVaultDialogOpen);
  const { closeVault, openVault, scanVault, indexVaultTags, isVaultSupported, isBrowserVaultSupported } = useFileSystem();
  const { recentVaults, openRecentVault } = useRecentVaults();
  const dialog = useDialog();
  const nameRef = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  if (!vaultHandle) return null;

  const name = vaultDisplayName(descriptor, vaultHandle.name);
  const kind = VAULT_KIND_LABEL[descriptor?.kind ?? "local"];

  const toggleMenu = () => {
    if (menu) { setMenu(null); return; }
    // Hangs from the name's left edge; the menu clamps itself to the viewport.
    const rect = nameRef.current?.getBoundingClientRect();
    setMenu({ x: rect ? rect.left : 0, y: rect ? rect.bottom + 6 : 0 });
  };

  const handleClose = async () => {
    const confirmed = await dialog.confirm(
      "You can reopen it later — this just disconnects the current vault.",
      "Close this vault?",
      "Close Vault",
      "Cancel",
    );
    if (confirmed) closeVault();
  };

  const items: TabContextMenuItem[] = [
    ...recentVaults.slice(0, MENU_RECENT_LIMIT).map((entry) => ({
      label: entry.name,
      icon: <VaultKindIcon kind={entry.kind} />,
      onClick: () => { void openRecentVault(entry); },
    })),
    ...(isVaultSupported
      ? [
          { label: "Open vault…", icon: <HiOutlineFolderOpen size={15} />, divider: true, onClick: () => { void openVault(); } },
          { label: "Create vault…", icon: <HiOutlineCollection size={15} />, onClick: () => setNewVaultFlowOpen(true) },
        ]
      : []),
    ...(isBrowserVaultSupported
      ? [{ label: "Browser vaults…", icon: <HiOutlineGlobeAlt size={15} />, divider: !isVaultSupported, onClick: () => setBrowserVaultDialogOpen(true) }]
      : []),
    {
      label: "Refresh vault",
      icon: <HiOutlineRefresh size={15} />,
      divider: true,
      onClick: () => {
        void scanVault(vaultHandle, showHiddenFiles);
        void indexVaultTags(vaultHandle, showHiddenFiles);
      },
    },
    { label: "Close vault", icon: <HiOutlineLogout size={15} />, onClick: () => { void handleClose(); } },
  ];

  return (
    <div className="flex items-center gap-1.5 border-b border-edge-subtle py-1.5 text-ui-footnote text-fg-muted">
      <HiOutlineDatabase size={14} aria-hidden="true" className="shrink-0" />
      <Button
        ref={nameRef}
        variant="unstyled"
        aria-label={`${name}, vault menu`}
        aria-haspopup="menu"
        aria-expanded={!!menu}
        onClick={(event) => { event.stopPropagation(); toggleMenu(); }}
        className={`-mx-1.5 flex min-h-[2.5rem] min-w-0 items-center gap-1 rounded-md px-1.5 font-medium text-fg transition-colors hover:bg-surface-raised ${
          menu ? "bg-surface-raised" : ""
        }`}
      >
        <span className="truncate">{name}</span>
        <HiChevronDown size={12} aria-hidden="true" className="shrink-0 text-fg-muted" />
      </Button>
      {/* Where it lives gives way first on a narrow screen. */}
      <span aria-hidden="true" className="hidden sm:inline">·</span>
      <span className="hidden min-w-0 truncate sm:inline">{kind}</span>
      {menu && (
        <TabContextMenu
          x={menu.x}
          y={menu.y}
          label="Vault"
          // The name toggles the menu itself; presses on it aren't outside clicks.
          anchorRef={nameRef}
          onClose={() => setMenu(null)}
          items={items}
        />
      )}
    </div>
  );
}
