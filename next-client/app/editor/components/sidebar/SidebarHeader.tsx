"use client";

import React, { useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { useRouter } from "next/navigation";
import { HiChevronDown, HiOutlineCog, HiOutlineDatabase, HiOutlineEmojiHappy } from "react-icons/hi";
import { VscLayoutSidebarLeft } from "react-icons/vsc";
import { atom_vaultName } from "@/app/atoms/vault-atoms";
import Button from "@/app/components/Button";
import { formatShortcut } from "@/app/utils/platform";
import { PANE_HEADER_HEIGHT, PANE_ICON_SIZE } from "../pane-header-classes";
import DocumentationLink from "../DocumentationLink";
import PaneToolbarButton from "../PaneToolbarButton";
import PinIconPopover from "../PinIconPopover";
import TabContextMenu from "../TabContextMenu";
import { useRecentVaults } from "../../hooks/use-recent-vaults";
import { useVaultMenuItems } from "../../hooks/use-vault-menu-items";

// The sidebar's top bar, level with the pane toolbar: the open vault's icon
// (its emoji, else a quiet vault glyph that turns into a smiley on hover; a
// click opens the emoji picker), the vault switcher (the open vault's
// name; its menu lists the pinned vaults, then Open / Create Vault and Recent
// Vaults…, as the pane title's crumb does), Documentation, Settings, and the
// button that hides the sidebar (the toolbar shows it again).
export default function SidebarHeader({ onHide }: { onHide: () => void }) {
  const router = useRouter();
  const vaultName = useAtomValue(atom_vaultName);
  const vaultItems = useVaultMenuItems();
  const { openVaultEntry, setRecentVaultIcon } = useRecentVaults();
  const [picker, setPicker] = useState<DOMRect | null>(null);
  const iconRef = useRef<HTMLButtonElement>(null);
  const [vaultMenu, setVaultMenu] = useState<{ x: number; y: number } | null>(null);
  const switcherRef = useRef<HTMLButtonElement>(null);
  const name = vaultName ?? "No vault";
  // The open vault is checked among the recent ones.
  const items = vaultItems.map((item) => (item.label === vaultName && !item.icon ? { ...item, checked: true } : item));

  return (
    <div className={`flex items-center gap-1 shrink-0 px-2 ${PANE_HEADER_HEIGHT}`}>
      <div className="flex flex-1 min-w-0 items-center">
        {openVaultEntry && (
          <Button
            ref={iconRef}
            variant="unstyled"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              setPicker((open) => (open ? null : rect));
            }}
            title={openVaultEntry.icon ? "Change vault icon" : "Add vault icon"}
            aria-label={openVaultEntry.icon ? "Change vault icon" : "Add vault icon"}
            aria-haspopup="dialog"
            aria-expanded={!!picker}
            className={`group flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-fg-faint hover:bg-fill hover:text-fg-muted ${picker ? "bg-fill" : ""}`}
          >
            {openVaultEntry.icon ? (
              <span aria-hidden="true" className="text-[13px] leading-none">{openVaultEntry.icon}</span>
            ) : (
              <>
                <HiOutlineDatabase size={14} aria-hidden="true" className="group-hover:hidden group-focus-visible:hidden" />
                <HiOutlineEmojiHappy size={14} aria-hidden="true" className="hidden group-hover:block group-focus-visible:block" />
              </>
            )}
          </Button>
        )}
        <Button
          ref={switcherRef}
          variant="unstyled"
          onClick={() => {
            const anchor = switcherRef.current?.getBoundingClientRect();
            setVaultMenu((open) => (open || !anchor ? null : { x: anchor.left, y: anchor.bottom + 4 }));
          }}
          disabled={items.length === 0}
          title="Switch vault"
          aria-label={`Switch vault: ${name}`}
          aria-haspopup="menu"
          aria-expanded={!!vaultMenu}
          className={`flex h-7 max-w-full items-center gap-1 rounded-md px-2 text-ui-footnote font-semibold text-fg select-none hover:bg-fill disabled:hover:bg-transparent ${vaultMenu ? "bg-fill" : ""}`}
        >
          <span className="truncate">{name}</span>
          <HiChevronDown size={12} aria-hidden="true" className="shrink-0 text-fg-faint" />
        </Button>
      </div>
      <DocumentationLink compact />
      <PaneToolbarButton
        icon={<HiOutlineCog size={PANE_ICON_SIZE} />}
        label="Settings"
        tooltipPosition="bottom-end"
        onClick={() => router.push("/editor/settings")}
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
      {picker && openVaultEntry && (
        <PinIconPopover
          anchor={picker}
          current={openVaultEntry.icon ?? null}
          onPick={async (icon) => {
            setRecentVaultIcon(openVaultEntry.key, icon);
            return true;
          }}
          onClose={() => setPicker(null)}
          anchorRef={iconRef}
          label="Vault icon"
        />
      )}
      {vaultMenu && (
        <TabContextMenu
          x={vaultMenu.x}
          y={vaultMenu.y}
          items={items}
          label="Switch vault"
          anchorRef={switcherRef}
          onClose={() => setVaultMenu(null)}
        />
      )}
    </div>
  );
}
