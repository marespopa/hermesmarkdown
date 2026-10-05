"use client";

import { HiOutlineFolderOpen, HiOutlinePlus } from "react-icons/hi";
import Button from "@/app/components/Button";
import { useFileSystem } from "@/app/hooks/use-file-system";
import VaultActionButtons from "../VaultActionButtons";
import RecentVaultList from "./RecentVaultList";

interface FeedStartProps {
  onNewNote: () => void;
  /** Opens a file from the device into the draft. */
  onOpenFile: () => void;
}

// The feed's body with no vault open, in place of the note list: recently
// opened vaults, the vault actions, then a way to just write (a blank note,
// or a file from the device).
export default function FeedStart({ onNewNote, onOpenFile }: FeedStartProps) {
  const { isVaultSupported, isBrowserVaultSupported } = useFileSystem();
  const canOpenVault = isVaultSupported || isBrowserVaultSupported;
  return (
    <section aria-label="Get started" className="flex flex-col items-start gap-8 pt-4">
      <RecentVaultList />
      {canOpenVault && (
        <div className="flex flex-col items-start gap-3">
          <p className="text-ui-body text-fg">Open a vault to see your notes here.</p>
          <div className="-ml-3">
            <VaultActionButtons />
          </div>
        </div>
      )}
      <div className="flex flex-col items-start gap-2">
        <p className="text-ui-footnote text-fg-muted">{canOpenVault ? "Or just write" : "Start writing"}</p>
        <div className="-ml-3 flex flex-wrap gap-2">
          <Button variant="tertiary" onClick={onNewNote}>
            <HiOutlinePlus size={16} />
            New Note
          </Button>
          <Button variant="tertiary" onClick={onOpenFile}>
            <HiOutlineFolderOpen size={16} />
            Open File…
          </Button>
        </div>
      </div>
    </section>
  );
}
