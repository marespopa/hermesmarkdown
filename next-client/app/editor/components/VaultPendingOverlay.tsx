"use client";

import React from "react";
import { HiOutlineDatabase, HiOutlineFolderOpen, HiOutlineGlobeAlt, HiOutlineLockClosed } from "react-icons/hi";
import Button from "@/app/components/Button";
import DialogModal from "@/app/components/DialogModal";
import type { RecentVault } from "@/app/services/recent-vaults";

// Clicks and key presses inside this mark never count as "tap anywhere to
// restore" (VaultAccessGate): they open another vault instead.
export const VAULT_ESCAPE_ATTR = "data-vault-escape";

// How many other recent vaults the screen offers; the rest are a folder pick away.
const MAX_OTHER_VAULTS = 3;

interface VaultPendingOverlayProps {
  restoreVault: () => void;
  /** The paused vault's folder name, when known. */
  vaultName?: string;
  /** The last tap's ask was refused, or no prompt came up. */
  denied?: boolean;
  /** Recent vaults other than the paused one. */
  otherVaults?: readonly RecentVault[];
  onOpenRecent?: (entry: RecentVault) => void;
  onOpenFolder?: () => void;
}

// Chrome on Android has no "Allow on every visit" option, so access is asked
// for again on every load there.
const isAndroid = () => typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

export default function VaultPendingOverlay({
  restoreVault,
  vaultName,
  denied = false,
  otherVaults = [],
  onOpenRecent,
  onOpenFolder,
}: VaultPendingOverlayProps) {
  const android = isAndroid();
  const shown = otherVaults.slice(0, MAX_OTHER_VAULTS);
  const folder = vaultName ? <span className="font-semibold">“{vaultName}”</span> : "your local folder";
  return (
    <DialogModal
      isOpened={true}
      onClose={() => {}}
      hideCloseButton={true}
      styles="!max-w-[320px] !bg-overlay !border-edge"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <HiOutlineLockClosed size={24} className="text-amber-500" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-ui-body font-semibold tracking-tight">Vault Access Paused</h2>
          <p className="text-ui-footnote text-ink-muted dark:text-stone leading-relaxed">
            Your browser needs permission again to open {folder}.
            {!android && (
              <>
                {" "}Choose <span className="font-semibold">Allow on every visit</span> so
                this doesn&apos;t come back.
              </>
            )}
          </p>
          {denied && (
            <p role="status" className="text-ui-footnote text-fg leading-relaxed mt-1">
              Access wasn&apos;t allowed. Try again, or open another vault below. If no prompt
              appears, allow file editing for this site in the browser&apos;s site settings.
            </p>
          )}
        </div>
        <Button
          variant="primary"
          onClick={restoreVault}
          className="w-full h-11 rounded-xl mt-1"
        >
          {denied ? "Try Again" : "Restore Access"}
        </Button>
        <p className="text-ui-footnote text-ink-muted dark:text-stone -mt-2">
          {android ? "or tap anywhere" : "or press any key"}
        </p>
        {(onOpenRecent || onOpenFolder) && (
          <div {...{ [VAULT_ESCAPE_ATTR]: "" }} className="flex w-full flex-col gap-2 border-t border-edge-subtle pt-4">
            <p className="text-ui-footnote text-ink-muted dark:text-stone">Or open another vault</p>
            {onOpenRecent && shown.map((entry) => (
              <Button
                key={entry.key}
                variant="secondary"
                onClick={() => onOpenRecent(entry)}
                className="w-full h-11 rounded-xl !justify-start gap-2 px-3"
              >
                {entry.icon ? (
                  <span aria-hidden="true">{entry.icon}</span>
                ) : entry.kind === "browser" ? (
                  <HiOutlineGlobeAlt size={16} aria-hidden="true" />
                ) : (
                  <HiOutlineDatabase size={16} aria-hidden="true" />
                )}
                <span className="truncate">{entry.name}</span>
              </Button>
            ))}
            {onOpenFolder && (
              <Button
                variant="secondary"
                onClick={onOpenFolder}
                className="w-full h-11 rounded-xl !justify-start gap-2 px-3"
              >
                <HiOutlineFolderOpen size={16} aria-hidden="true" />
                <span>Open Folder…</span>
              </Button>
            )}
          </div>
        )}
      </div>
    </DialogModal>
  );
}
