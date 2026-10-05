import type { Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import { formatShortcut } from "@/app/utils/platform";
import type { EditorCommandContext } from "./use-editor-command-context";

export function buildDocumentVaultCommandGroups(context: EditorCommandContext) {
  const {
    activeFileHandle,
    activeFilePath,
    activeLeaf,
    closeVault,
    createFolder,
    createNewFile,
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
    onHome,
    onImport,
    onNewFile,
    onOpenDocumentation,
    onRefreshVault,
    onSave,
    openVault,
    renameFile,
    setBrowserVaultDialogOpen,
    setNewVaultFlowOpen,
    toggleHomePin,
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
      label: "New file",
      keywords: "create note draft",
      action: onNewFile,
    },
    ...(vaultHandle
      ? [{
          id: "new-file-in-folder",
          label: "New file in folder…",
          keywords: "create note name folder",
          // Folder picker + name prompt: the explicit alternative to the
          // draft flow, which names the note from its first line.
          action: () => { void createNewFile(); },
        },
        {
          id: "new-note-from-template",
          label: "New note from template…",
          category: "Vault" as const,
          keywords: "create template note",
          // Template picker + title prompt; the template's target_folder /
          // file_name place and name the note.
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
          // The active note's text becomes <templates folder>/<name>.md.
          action: () => { document.dispatchEvent(new CustomEvent("hermes:save-as-template")); },
        },
        {
          id: "new-template",
          label: "New template…",
          category: "Vault" as const,
          keywords: "create template add template new template",
          // Name prompt; creates <templates folder>/<name>.md with a starter
          // body, or opens the existing template of that name.
          action: () => { void createTemplate(); },
        }]
      : []),
    {
      id: "export-file",
      label: "Export current file",
      keywords: "save download",
      action: onExport,
    },
    {
      id: "import-file",
      label: "Import file",
      category: "Vault",
      keywords: "open upload markdown text",
      action: onImport,
    },
  ];

  const fileOperations: Command[] = [
    ...(activeFileHandle
      ? [{
          id: "duplicate-current-file",
          label: "Duplicate current file",
          category: "Document" as const,
          keywords: "copy clone file",
          action: () => duplicateFile(activeFileHandle),
        }]
      : []),
    ...(activeFileHandle && vaultHandle
      ? [{
          id: "move-current-file",
          label: "Move current file",
          category: "Document" as const,
          keywords: "relocate folder file",
          action: async () => {
            const directories: FileSystemDirectoryHandle[] = [];
            for await (const entry of (vaultHandle as any).values()) {
              if (entry.kind === "directory" && !entry.name.startsWith(".")) directories.push(entry);
            }
            directories.sort((a, b) => a.name.localeCompare(b.name));
            const destination = await dialog.select(
              "Choose a destination folder:",
              [
                { label: `/ ${vaultHandle.name} (root)`, value: "__root__" },
                ...directories.map((directory) => ({ label: directory.name, value: directory.name })),
              ],
              "Move File",
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
    {
      id: "go-home",
      label: "Home",
      keywords: "home vault switcher",
      action: onHome,
    },
    ...(vaultHandle && activeFileHandle && activeFilePath
      ? [{
          id: "toggle-home-pin",
          label: homePinnedPaths.includes(activeFilePath) ? "Unpin from Home" : "Pin to Home",
          keywords: "pin unpin home feed top favorite",
          action: () => toggleHomePin(activeFilePath),
        }]
      : []),
    {
      id: "open-documentation",
      label: "Documentation",
      keywords: "docs help guide",
      action: onOpenDocumentation,
    },
    ...(vaultHandle
      ? [{
          id: "close-vault",
          label: "Close vault",
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
          label: "Rename current file",
          keywords: "rename move file",
          action: () => renameFile(activeFileHandle, undefined, activeFilePath ?? undefined),
        }]
      : []),
    ...(activeFileHandle
      ? [{
          id: "delete-current-file",
          label: "Delete current file",
          keywords: "delete remove trash file",
          action: () => deleteFile(activeFileHandle, activeFilePath),
        }]
      : []),
    ...(vaultHandle && onRefreshVault
      ? [{
          id: "refresh-vault",
          label: "Refresh vault",
          keywords: "rescan reload vault files",
          action: () => onRefreshVault(),
        }]
      : []),
    {
      id: "create-new-vault",
      label: "Create new vault",
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
          label: "New folder",
          keywords: "create directory",
          action: createFolder,
        }]
      : []),
  ];

  return { lifecycle, fileOperations, vaultActions };
}
