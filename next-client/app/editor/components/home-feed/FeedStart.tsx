"use client";

import { useSetAtom } from "jotai";
import { HiOutlineCollection, HiOutlineDatabase, HiOutlineDocumentText, HiOutlineGlobeAlt, HiOutlinePencilAlt, HiOutlineSparkles } from "react-icons/hi";
import { atom_browserVaultDialogOpen, atom_newVaultFlowOpen } from "@/app/atoms/ui-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import FeedTips from "./FeedTips";
import FeedWelcome from "./FeedWelcome";
import RecentVaultList from "./RecentVaultList";
import { StartGroup, StartIcon, StartRow } from "./StartGroup";
import StartName from "./StartName";

interface FeedStartProps {
  onNewNote: () => void;
  /** Opens a file from the device into the draft. */
  onOpenFile: () => void;
}

// The feed's body with no vault open, in place of the note list: a welcome
// card, then inset grouped cards: the name (until one is given), recently
// opened vaults, ways to keep notes (the vault kinds this browser supports),
// ways to just write (a blank note, or a file from the device), and a line
// of tips.
export default function FeedStart({ onNewNote, onOpenFile }: FeedStartProps) {
  const { openVault, isVaultSupported, isBrowserVaultSupported } = useFileSystem();
  const setNewVaultFlowOpen = useSetAtom(atom_newVaultFlowOpen);
  const setBrowserVaultDialogOpen = useSetAtom(atom_browserVaultDialogOpen);
  const canOpenVault = isVaultSupported || isBrowserVaultSupported;
  return (
    <section aria-label="Get started" className="flex flex-col gap-8 pt-2">
      <FeedWelcome
        icon={<HiOutlineSparkles size={22} />}
        title="Write in plain Markdown"
        message="Your notes are ordinary .md files you own, kept on this device. No account, nothing to set up."
      />
      <StartName />
      <RecentVaultList />
      {canOpenVault && (
        <StartGroup title="Keep your notes" footer="Open a vault to see your notes here.">
          {isVaultSupported && (
            <>
              <StartRow
                icon={<StartIcon tone="sage"><HiOutlineDatabase size={18} /></StartIcon>}
                title="Open Vault"
                subtitle="A folder of notes on this device"
                onClick={() => openVault()}
              />
              <StartRow
                icon={<StartIcon tone="sage"><HiOutlineCollection size={18} /></StartIcon>}
                title="Create Vault"
                subtitle="A new folder for your notes"
                onClick={() => setNewVaultFlowOpen(true)}
              />
            </>
          )}
          {isBrowserVaultSupported && (
            <StartRow
              icon={<StartIcon tone="sage"><HiOutlineGlobeAlt size={18} /></StartIcon>}
              title="Browser Vault"
              subtitle="Notes kept in this browser"
              onClick={() => setBrowserVaultDialogOpen(true)}
            />
          )}
        </StartGroup>
      )}
      <StartGroup title={canOpenVault ? "Or just write" : "Start writing"}>
        <StartRow
          icon={<StartIcon tone="accent"><HiOutlinePencilAlt size={18} /></StartIcon>}
          title="New Note"
          subtitle="A blank page"
          onClick={onNewNote}
        />
        <StartRow
          icon={<StartIcon tone="accent"><HiOutlineDocumentText size={18} /></StartIcon>}
          title="Open File…"
          subtitle="A Markdown file from this device"
          onClick={onOpenFile}
        />
      </StartGroup>
      <FeedTips />
    </section>
  );
}
