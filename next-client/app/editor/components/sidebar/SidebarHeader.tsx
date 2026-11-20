"use client";

import React, { useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { HiOutlineDatabase, HiOutlineEmojiHappy } from "react-icons/hi";
import { VscLayoutSidebarLeft } from "react-icons/vsc";
import { atom_vaultName } from "@/app/atoms/vault-atoms";
import Button from "@/app/components/Button";
import { formatShortcut } from "@/app/utils/platform";
import { PANE_HEADER_HEIGHT, PANE_ICON_SIZE } from "../pane-header-classes";
import PaneToolbarButton from "../PaneToolbarButton";
import PinIconPopover from "../PinIconPopover";
import { useRecentVaults } from "../../hooks/use-recent-vaults";

// The sidebar's top bar, level with the pane toolbar: the open vault's icon
// (its emoji, else a quiet vault glyph that turns into a smiley on hover; a
// click opens the emoji picker), the vault switcher (the open vault's
// name; its menu lists the pinned vaults, then Open / Create Vault and Recent
// Vaults…, as the pane title's crumb does), and the button that hides the
// sidebar (the toolbar shows it again). Settings is in the window's top-right
// corner (SettingsButton).
export default function SidebarHeader({ onHide }: { onHide: () => void }) {
  const vaultName = useAtomValue(atom_vaultName);
  const { openVaultEntry, setRecentVaultIcon } = useRecentVaults();
  const [picker, setPicker] = useState<DOMRect | null>(null);
  const iconRef = useRef<HTMLButtonElement>(null);
  const name = vaultName ?? "No vault";

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
        <span className="truncate px-2 text-ui-footnote font-semibold text-fg select-none" title={name}>{name}</span>
      </div>
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
    </div>
  );
}
