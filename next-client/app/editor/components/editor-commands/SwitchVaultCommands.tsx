"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { atom_vaultKey } from "@/app/atoms/vault-atoms";
import { atom_recentVaultsDialogOpen } from "@/app/atoms/ui-atoms";
import type { Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import { useRecentVaults } from "../../hooks/use-recent-vaults";
import RegisteredCommands from "./RegisteredCommands";

// Switch Vault…: a palette menu that lists the top vaults (pinned and
// recently accessed) and opens the chosen one. Mounted by EditorShell, so
// it's offered on every /editor route.
export default function SwitchVaultCommands() {
  const vaultKey = useAtomValue(atom_vaultKey);
  const { allRecentVaults, openRecentVault } = useRecentVaults();
  const setRecentVaultsDialogOpen = useSetAtom(atom_recentVaultsDialogOpen);

  if (allRecentVaults.length < 2) return null;

  const sorted = [...allRecentVaults].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    const aTime = (a as { lastOpened?: number; openedAt?: number }).lastOpened ?? (a as { openedAt?: number }).openedAt ?? 0;
    const bTime = (b as { lastOpened?: number; openedAt?: number }).lastOpened ?? (b as { openedAt?: number }).openedAt ?? 0;
    return bTime - aTime;
  });

  const top = sorted.slice(0, 6);

  const nameCounts = new Map<string, number>();
  for (const entry of allRecentVaults) {
    nameCounts.set(entry.name, (nameCounts.get(entry.name) ?? 0) + 1);
  }

  const labelFor = (entry: (typeof allRecentVaults)[number]) => {
    if ((nameCounts.get(entry.name) ?? 0) > 1) {
      const context = entry.kind === "browser" ? "Browser" : "Local";
      return `${entry.name} (${context})`;
    }
    return entry.name;
  };

  const subcommands: Command[] = top.map((entry): Command => ({
    id: `switch-vault:${entry.key}`,
    label: labelFor(entry),
    category: "Vault",
    disabledReason: entry.key === vaultKey ? "Current vault" : undefined,
    action: () => openRecentVault(entry),
  }));

  if (allRecentVaults.length > 6) {
    subcommands.push({
      id: "switch-vault:view-all",
      label: "View All Recent Vaults…",
      category: "Vault",
      action: () => setRecentVaultsDialogOpen(true),
    });
  }

  const command: Command = {
    id: "switch-vault",
    label: "Switch Vault…",
    category: "Vault",
    keywords: ["switch", "vault", "workspace", "change", "open", "recent"],
    subcommands,
    action: () => {},
  };

  return <RegisteredCommands commands={[command]} />;
}
