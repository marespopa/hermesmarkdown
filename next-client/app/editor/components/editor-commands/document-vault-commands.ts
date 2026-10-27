import type { Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import { vaultDisplayName } from "@/app/atoms/vault-atoms";
import { formatShortcut } from "@/app/utils/platform";
import type { EditorCommandContext } from "./use-editor-command-context";

export function buildDocumentVaultCommandGroups(context: EditorCommandContext) {
  const {
    activeFileHandle,
    activeFileBusy,
    activeFilePath,
    activeLeaf,
    boardMarkdownPaths,
    closeVault,
    activeIsBoard,
    createBoard,
    createFolder,
    createTemplate,
    newFromFolderTemplate,
    deleteFile,
    dialog,
    duplicateFile,
    handleCopy,
    pinnedNotePaths,
    moveItem,
    onExport,
    onImport,
    onNewFile,
    onRefreshVault,
    onSave,
    openVault,
    renameFile,
    setNewVaultFlowOpen,
    toggleBoardMarkdown,
    toggleNotePin,
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
      label: "New File",
      keywords: "create note draft new file",
      action: onNewFile,
    },
    ...(vaultHandle
      ? [{
          id: "new-board",
          label: "New board",
          category: "Vault" as const,
          keywords: "board canvas drawing sketch whiteboard excalidraw draw diagram",
          action: () => { void createBoard(); },
        }]
      : []),
    ...(vaultHandle
      ? [{
          id: "insert-template",
          label: "Insert template…",
          category: "Vault" as const,
          keywords: "template insert apply selection wrap",
          closeFirst: true,
          // The active editor's template picker; selected text fills {{selection}}.
          action: () => { document.dispatchEvent(new CustomEvent("hermes:insert-vault-template")); },
        },
        {
          id: "save-as-template",
          label: "Save as template…",
          category: "Vault" as const,
          keywords: "template save create from note preset",
          closeFirst: true,
          // The active note's text becomes _templates/<name>.md.
          action: () => { document.dispatchEvent(new CustomEvent("hermes:save-as-template")); },
        },
        {
          id: "new-template",
          label: "New template…",
          category: "Vault" as const,
          keywords: "create template add template new template wizard folder template make your own",
          // The template wizard: a note or folder template, blank, from a
          // built-in example or from a vault folder (use-template-wizard.ts).
          action: () => { void createTemplate(); },
        },
        {
          id: "new-from-folder-template",
          label: "New from folder template…",
          category: "Vault" as const,
          keywords: "folder template scaffold structure project new folder from template copy",
          // Pick a folder template (_templates/<F>/ with scaffold: true in its
          // README.md, or a built-in one) and a destination; copies it into a
          // new folder.
          action: () => { void newFromFolderTemplate(); },
        }]
      : []),
    {
      id: "export-file",
      label: "Export as Markdown",
      keywords: "export download save copy md file note",
      action: onExport,
    },
    {
      id: "import-file",
      label: "Open File from Disk…",
      category: "Vault",
      // Opens a Markdown or text file from the device as a draft; Import
      // Files into Vault… (vault-storage-commands) copies files in instead.
      keywords: "open import upload markdown text file device draft",
      action: onImport,
    },
  ];

  const fileOperations: Command[] = [
    ...(activeFilePath && activeIsBoard
      ? [{
          id: "toggle-board-markdown",
          label: boardMarkdownPaths.has(activeFilePath) ? "Open as Board" : "Edit Board as Markdown",
          category: "Document" as const,
          keywords: "board markdown raw source json repair edit",
          action: () => toggleBoardMarkdown(activeFilePath),
        }]
      : []),
    ...(activeFileHandle
      ? [{
          id: "duplicate-current-file",
          label: "Duplicate File",
          category: "Document" as const,
          keywords: "copy clone note file current",
          action: () => duplicateFile(activeFileHandle),
        }]
      : []),
    ...(activeFileHandle && vaultHandle
      ? [{
          id: "move-current-file",
          label: "Move File…",
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
    ...(vaultHandle && activeFileHandle && activeFilePath
      ? [{
          id: "toggle-note-pin",
          label: pinnedNotePaths.includes(activeFilePath) ? "Unpin File" : "Pin File",
          keywords: "pin unpin pinned favorite top palette files",
          action: () => toggleNotePin(activeFilePath),
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
          label: "Copy Contents",
          // Any open file: a note's Markdown, a code file's source.
          keywords: "copy clipboard content markdown text code source",
          action: () => { void handleCopy(); },
        }]
      : []),
    ...(activeFileHandle
      ? [{
          id: "rename-current-file",
          label: "Rename File",
          keywords: "rename move note file current title",
          disabledReason: activeFileBusy ? "The file is being changed" : undefined,
          action: () => renameFile(activeFileHandle, undefined, activeFilePath ?? undefined),
        }]
      : []),
    ...(activeFileHandle
      ? [{
          id: "delete-current-file",
          label: "Delete File",
          keywords: "delete remove trash note file current",
          disabledReason: activeFileBusy ? "The file is being changed" : undefined,
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
      // Asks disk or browser where both work (NewVaultDialog).
      action: () => setNewVaultFlowOpen(true),
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
