import type { Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import { vaultDisplayName } from "@/app/atoms/vault-atoms";
import { formatShortcut } from "@/app/utils/platform";
import type { EditorCommandContext } from "./use-editor-command-context";

export function buildDocumentVaultCommandGroups(context: EditorCommandContext) {
  const {
    activeFileHandle,
    activeFilePath,
    activeLeaf,
    closeVault,
    createFolder,
    createNoteFromTemplate,
    createTemplate,
    deleteFile,
    dialog,
    duplicateFile,
    handleCopy,
    homePinnedPaths,
    isVaultSupported,
    moveItem,
    onExport,
    onImport,
    onNewFile,
    onRefreshVault,
    onSave,
    openVault,
    renameFile,
    setBrowserVaultDialogOpen,
    setNewVaultFlowOpen,
    toggleHomePin,
    vaultDescriptor,
    vaultHandle,
  } = context;

  const lifecycle: Command[] = [
    {
      id: "save-file",
      label: "Save",
      shortcut: formatShortcut("S"),
      keywords: "save write",
      action: onSave,
    },
    {
      id: "new-file",
      label: "New Note",
      keywords: "create note draft new file",
      action: onNewFile,
    },
    ...(vaultHandle
      ? [{
          id: "new-note-from-template",
          label: "New note from template…",
          category: "Vault" as const,
          keywords: "create template note",
          // Template picker (+ title prompt unless file_name names the note);
          // the note goes in the New Notes folder, or opens if it's there.
          action: () => { void createNoteFromTemplate(); },
        },
        {
          id: "insert-template",
          label: "Insert template…",
          category: "Vault" as const,
          keywords: "template insert apply selection wrap",
          // The active editor's template picker; selected text fills {{selection}}.
          action: () => { document.dispatchEvent(new CustomEvent("hermes:insert-vault-template")); },
        },
        {
          id: "save-as-template",
          label: "Save as template…",
          category: "Vault" as const,
          keywords: "template save create from note preset",
          // The active note's text becomes templates/<name>.md.
          action: () => { document.dispatchEvent(new CustomEvent("hermes:save-as-template")); },
        },
        {
          id: "new-template",
          label: "New template…",
          category: "Vault" as const,
          keywords: "create template add template new template",
          // Name prompt; creates templates/<name>.md with a minimal body, or
          // opens the existing template of that name.
          action: () => { void createTemplate(); },
        }]
      : []),
    {
      id: "export-file",
      label: "Download as Markdown",
      keywords: "export download save copy md file note",
      action: onExport,
    },
    {
      id: "import-file",
      label: "Open Note from Disk…",
      category: "Vault",
      // Opens a Markdown or text file from the device as a draft; Import
      // Files into Vault… (vault-storage-commands) copies files in instead.
      keywords: "open import upload markdown text file device draft",
      action: onImport,
    },
  ];

  const fileOperations: Command[] = [
    ...(activeFileHandle
      ? [{
          id: "duplicate-current-file",
          label: "Duplicate Note",
          category: "Document" as const,
          keywords: "copy clone note file current",
          action: () => duplicateFile(activeFileHandle),
        }]
      : []),
    ...(activeFileHandle && vaultHandle
      ? [{
          id: "move-current-file",
          label: "Move Note…",
          category: "Document" as const,
          keywords: "relocate folder note file current",
          action: async () => {
            const directories: FileSystemDirectoryHandle[] = [];
            for await (const entry of (vaultHandle as any).values()) {
              if (entry.kind === "directory" && !entry.name.startsWith(".")) directories.push(entry);
            }
            directories.sort((a, b) => a.name.localeCompare(b.name));
            const destination = await dialog.select(
              "Choose a destination folder:",
              [
                { label: `/ ${vaultDisplayName(vaultDescriptor, vaultHandle.name)} (root)`, value: "__root__" },
                ...directories.map((directory) => ({ label: directory.name, value: directory.name })),
              ],
              "Move Note",
            );
            if (!destination) return;
            const target = destination === "__root__"
              ? vaultHandle
              : directories.find((directory) => directory.name === destination);
            if (target) await moveItem(activeFileHandle, target);
          },
        }]
      : []),
  ];

  const vaultActions: Command[] = [
    ...(vaultHandle && activeFileHandle && activeFilePath
      ? [{
          id: "toggle-home-pin",
          label: homePinnedPaths.includes(activeFilePath) ? "Unpin from Home" : "Pin to Home",
          keywords: "pin unpin home feed top favorite",
          action: () => toggleHomePin(activeFilePath),
        }]
      : []),
    ...(vaultHandle
      ? [{
          id: "close-vault",
          label: "Close Vault",
          keywords: "disconnect vault switch exit",
          action: async () => {
            const confirmed = await dialog.confirm(
              "You can reopen it later — this just disconnects the current vault.",
              "Close this vault?",
              "Close Vault",
              "Cancel",
            );
            if (confirmed) closeVault();
          },
        }]
      : []),
    ...(activeLeaf && activeLeaf.openFilePaths.length > 0
      ? [{
          id: "copy-markdown",
          label: "Copy Markdown",
          keywords: "copy clipboard content",
          action: () => { void handleCopy(); },
        }]
      : []),
    ...(activeFileHandle
      ? [{
          id: "rename-current-file",
          label: "Rename Note",
          keywords: "rename move note file current title",
          action: () => renameFile(activeFileHandle, undefined, activeFilePath ?? undefined),
        }]
      : []),
    ...(activeFileHandle
      ? [{
          id: "delete-current-file",
          label: "Delete Note",
          keywords: "delete remove trash note file current",
          action: () => deleteFile(activeFileHandle, activeFilePath),
        }]
      : []),
    ...(vaultHandle && onRefreshVault
      ? [{
          id: "refresh-vault",
          label: "Refresh Vault",
          keywords: "rescan reload vault files",
          action: () => onRefreshVault(),
        }]
      : []),
    {
      id: "create-new-vault",
      label: "Create New Vault",
      keywords: "vault new folder",
      // Without disk folder access, new vaults live in browser storage.
      action: () => (isVaultSupported ? setNewVaultFlowOpen(true) : setBrowserVaultDialogOpen(true)),
    },
    {
      id: "open-vault",
      label: "Open Vault",
      keywords: "vault folder",
      action: () => openVault(),
    },
    ...(vaultHandle
      ? [{
          id: "new-folder",
          label: "New Folder",
          keywords: "create directory",
          action: createFolder,
        }]
      : []),
  ];

  return { lifecycle, fileOperations, vaultActions };
}
