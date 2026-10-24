"use client";

import { useAtomValue } from "jotai";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import type { Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";
import { usePins } from "@/app/hooks/use-pins";
import { PIN_PAGES } from "@/app/services/vault-pins-format";
import { PINNED_PAGES } from "../sidebar/pinned-pages";
import RegisteredCommands from "./RegisteredCommands";

// Pin Page to Sidebar…: a palette menu with one command per app page (All
// Notes, Tags, Tasks, Templates, Trash, Settings) that pins it to the
// sidebar's Pinned section; an already pinned page is disabled. Mounted by
// EditorShell, so it's offered on every /editor route. Disabled without a
// vault, and on mobile, which has no sidebar.
export default function PinCommands() {
  const hasVault = !!useAtomValue(atom_vaultHandle);
  const isMobileChrome = useIsMobileChrome();
  const { isPinned, pin } = usePins();

  const command: Command = {
    id: "pin-page",
    label: "Pin Page to Sidebar…",
    category: "Workspace",
    keywords: "pin page sidebar tasks tags templates trash settings all notes favorite",
    disabledReason: !hasVault ? "Open a vault first" : isMobileChrome ? "The sidebar isn't shown on this screen" : undefined,
    subcommands: PIN_PAGES.map((page): Command => ({
      id: `pin-page:${page}`,
      label: PINNED_PAGES[page].label,
      category: "Workspace",
      disabledReason: isPinned("page", page) ? "Already pinned" : undefined,
      action: () => pin("page", page),
    })),
    action: () => {},
  };

  return <RegisteredCommands commands={[command]} />;
}
