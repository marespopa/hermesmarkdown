import toast from "react-hot-toast";
import type { Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import { formatShortcut } from "@/app/utils/platform";
import type { EditorCommandContext } from "./use-editor-command-context";

export function buildDocumentVaultCommandGroups(context: EditorCommandContext) {
  const {
    activeFileHandle,
    activeFilePath,
    activeLeaf,
    closeVault,
    deleteFile,
    dialog,
    duplicateFile,
    handleCopy,
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
    scanVault,
    setNewVaultFlowOpen,
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
      keywords: "create note",
      action: onNewFile,
    },
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
          action: () => renameFile(activeFileHandle),
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
          label: "New folder",
          keywords: "create directory",
          action: async () => {
            const folderPath = String(await dialog.prompt("Enter folder path:", "", "New Folder") ?? "");
            if (!folderPath) return;
            try {
              const segments = folderPath.split(/[\\/]/).map((segment) => segment.trim()).filter(Boolean);
              if (segments.length === 0 || segments.some((segment) => segment === "." || segment === "..")) {
                toast.error("Enter a valid folder path");
                return;
              }
              let directory = vaultHandle;
              for (const segment of segments) {
                directory = await directory.getDirectoryHandle(segment, { create: true });
              }
              await scanVault(vaultHandle);
            } catch {
              toast.error("Failed to create folder");
            }
          },
        }]
      : []),
  ];

  return { lifecycle, fileOperations, vaultActions };
}
