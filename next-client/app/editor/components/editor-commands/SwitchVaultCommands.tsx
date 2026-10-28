"use client";

import { useAtomValue } from "jotai";
import { atom_vaultKey } from "@/app/atoms/vault-atoms";
import type { Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import { useRecentVaults } from "../../hooks/use-recent-vaults";
import RegisteredCommands from "./RegisteredCommands";

// Switch Vault…: a palette menu with one command per pinned vault, offered
// only while two or more are pinned (the open vault is listed, disabled).
// Mounted by EditorShell, so it's offered on every /editor route.
export default function SwitchVaultCommands() {
  const vaultKey = useAtomValue(atom_vaultKey);
  const { allRecentVaults, openRecentVault } = useRecentVaults();
  const pinned = allRecentVaults.filter((entry) => entry.pinned);
  if (pinned.length < 2) return null;

  const command: Command = {
    id: "switch-vault",
    label: "Switch Vault…",
    category: "Vault",
    keywords: "switch vault workspace change open pinned",
    subcommands: pinned.map((entry): Command => ({
      id: `switch-vault:${entry.key}`,
      label: entry.name,
      category: "Vault",
      disabledReason: entry.key === vaultKey ? "Current vault" : undefined,
      action: () => openRecentVault(entry),
    })),
    action: () => {},
  };

  return <RegisteredCommands commands={[command]} />;
}
