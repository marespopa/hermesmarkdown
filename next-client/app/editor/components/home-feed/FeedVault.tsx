"use client";

import { useAtomValue } from "jotai";
import { HiOutlineDatabase, HiOutlineLogout } from "react-icons/hi";
import { atom_vaultDescriptor, atom_vaultHandle, type VaultDescriptor } from "@/app/atoms/vault-atoms";
import Button from "@/app/components/Button";
import { useDialog } from "@/app/hooks/use-dialog";
import { useFileSystem } from "@/app/hooks/use-file-system";

const KIND_LABEL: Record<VaultDescriptor["kind"], string> = {
  local: "Folder on this device",
  browser: "Stored in this browser",
  github: "GitHub",
};

// The vault's own name: browser and GitHub vaults carry a display name
// (their handle is an internal workspace folder); a local vault is its folder.
export function vaultDisplayName(descriptor: VaultDescriptor | null, handleName: string): string {
  if (descriptor && descriptor.kind !== "local" && descriptor.displayName) return descriptor.displayName;
  return handleName;
}

// The bar at the top of the feed: which vault it's showing, and a way to
// close it (after a confirm). Closing leaves the feed open, now as the
// no-vault start.
export default function FeedVault() {
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const descriptor = useAtomValue(atom_vaultDescriptor);
  const { closeVault } = useFileSystem();
  const dialog = useDialog();
  if (!vaultHandle) return null;

  const name = vaultDisplayName(descriptor, vaultHandle.name);
  const kind = KIND_LABEL[descriptor?.kind ?? "local"];

  const handleClose = async () => {
    const confirmed = await dialog.confirm(
      "You can reopen it later — this just disconnects the current vault.",
      "Close this vault?",
      "Close Vault",
      "Cancel",
    );
    if (confirmed) closeVault();
  };

  return (
    <div className="flex items-center justify-between gap-3 border-b border-edge-subtle py-3 text-ui-footnote text-fg-muted">
      <p className="flex min-w-0 items-center gap-1.5">
        <HiOutlineDatabase size={14} aria-hidden="true" className="shrink-0" />
        <span className="truncate">
          <span className="font-medium text-fg">{name}</span>
          <span aria-hidden="true"> · </span>
          <span className="sr-only">, </span>
          {kind}
        </span>
      </p>
      <Button variant="outlined" onClick={() => void handleClose()} className="!h-8 shrink-0 !px-3">
        <HiOutlineLogout size={14} aria-hidden="true" />
        Close vault
      </Button>
    </div>
  );
}
