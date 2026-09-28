import type { Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import type { EditorCommandContext } from "./use-editor-command-context";

// Browser vaults and whole-vault export/import (backups, moving a vault
// between browsers or onto disk).
export function buildVaultStorageCommands(context: EditorCommandContext): Command[] {
  const {
    dialog,
    deleteBrowserVault,
    exportVaultToFolder,
    exportVaultZip,
    importIntoVault,
    isBrowserVaultSupported,
    isVaultSupported,
    setBrowserVaultDialogOpen,
    supportsFolderImport,
    vaultDescriptor,
    vaultHandle,
  } = context;

  return [
    ...(isBrowserVaultSupported
      ? [{
          id: "browser-vaults",
          label: "Browser vaults…",
          description: "Create, open, or delete vaults stored in this browser",
          category: "Vault" as const,
          keywords: "vault offline storage opfs safari firefox mobile new open",
          action: () => setBrowserVaultDialogOpen(true),
        }]
      : []),
    ...(vaultHandle
      ? [
          {
            id: "export-vault-zip",
            label: "Export vault as zip",
            description: "Download every file in the vault as a backup",
            category: "Vault" as const,
            keywords: "backup download archive zip export vault",
            action: () => { void exportVaultZip(); },
          },
          ...(isVaultSupported
            ? [{
                id: "export-vault-folder",
                label: "Export vault to folder…",
                description: "Copy every file in the vault into a folder on disk",
                category: "Vault" as const,
                keywords: "backup copy folder disk export vault",
                action: () => { void exportVaultToFolder(); },
              }]
            : []),
          {
            id: "import-into-vault",
            label: "Import files into vault…",
            description: "Add notes, attachments, or a zip to this vault without overwriting",
            category: "Vault" as const,
            keywords: "restore upload zip import files vault",
            action: () => { void importIntoVault("files"); },
          },
          ...(supportsFolderImport
            ? [{
                id: "import-folder-into-vault",
                label: "Import folder into vault…",
                description: "Add a folder of notes to this vault without overwriting",
                category: "Vault" as const,
                keywords: "restore upload folder import vault",
                action: () => { void importIntoVault("folder"); },
              }]
            : []),
        ]
      : []),
    ...(vaultDescriptor?.kind === "browser"
      ? [{
          id: "delete-browser-vault",
          label: "Delete browser vault",
          description: "Permanently remove this vault from browser storage",
          category: "Vault" as const,
          keywords: "remove delete browser vault storage",
          danger: true,
          action: async () => {
            const confirmed = await dialog.confirm(
              `All notes in "${vaultDescriptor.displayName}" will be removed from this browser. Export the vault first if you want a copy.`,
              "Delete this browser vault?",
              "Delete Vault",
              "Cancel",
            );
            if (confirmed) await deleteBrowserVault(vaultDescriptor);
          },
        }]
      : []),
  ];
}
