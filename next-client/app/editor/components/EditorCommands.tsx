"use client";

import { useAtom, useAtomValue } from "jotai";
import { useRouter } from "next/navigation";
import {
  atom_workspaceLayout,
  atom_activePaneId,
  atom_closeTab,
  findLeaf,
} from "@/app/atoms/atoms";
import {
  atom_theme,
  atom_railPanel,
  atom_isDocInfoOpen,
  atom_aiBuilderRequest,
  atom_isAiConfigured,
} from "@/app/atoms/ui-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useDialog } from "@/app/hooks/use-dialog";
import toast from "react-hot-toast";
import { useRegisterCommand } from "@/app/components/CommandPalette/CommandPaletteContext";
import { formatShortcut } from "@/app/utils/platform";

// Registers the app's global command-palette entries. Mounted once inside
// the editor route, alongside CommandPaletteProvider. Each command is a thin
// wrapper around an existing handler/atom — no new behavior, just a second
// entry point for it.
export default function EditorCommands({
  onNewFile,
  onExport,
  onSave,
}: {
  onNewFile: () => void;
  onExport: () => void;
  onSave: () => void;
}) {
  const router = useRouter();
  const { openVault, vaultHandle, scanVault } = useFileSystem();
  const dialog = useDialog();
  const [theme, setTheme] = useAtom(atom_theme);
  const [railPanel, setRailPanel] = useAtom(atom_railPanel);
  const [, setIsDocInfoOpen] = useAtom(atom_isDocInfoOpen);
  const [, setAiBuilderRequest] = useAtom(atom_aiBuilderRequest);
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const workspaceLayout = useAtomValue(atom_workspaceLayout);
  const activePaneId = useAtomValue(atom_activePaneId);
  const [, closeTab] = useAtom(atom_closeTab);

  useRegisterCommand({
    id: "save-file",
    label: "Save",
    shortcut: formatShortcut("S"),
    keywords: "save write",
    action: onSave,
  });

  useRegisterCommand({
    id: "new-file",
    label: "New file",
    keywords: "create note",
    action: onNewFile,
  });

  useRegisterCommand({
    id: "export-file",
    label: "Export current file",
    keywords: "save download",
    action: onExport,
  });

  useRegisterCommand({
    id: "toggle-sidebar-pin",
    label: railPanel !== null ? "Collapse sidebar" : "Expand sidebar",
    shortcut: formatShortcut("E", { shift: true }),
    keywords: "sidebar collapse expand explorer files",
    action: () => setRailPanel((prev) => (prev !== null ? null : "files")),
  });

  useRegisterCommand({
    id: "toggle-theme",
    label: theme === "dark" ? "Switch to light theme" : "Switch to dark theme",
    keywords: "dark light theme appearance",
    action: () => setTheme(theme === "dark" ? "light" : "dark"),
  });

  useRegisterCommand({
    id: "open-settings",
    label: "Open settings",
    keywords: "preferences config",
    action: () => router.push("/editor/settings"),
  });

  useRegisterCommand({
    id: "open-vault",
    label: "Open vault",
    keywords: "vault folder",
    action: () => openVault(),
  });

  useRegisterCommand(
    vaultHandle
      ? {
          id: "new-folder",
          label: "New folder",
          keywords: "create directory",
          action: async () => {
            const folderName = await dialog.prompt("Enter folder name:", "", "New Folder");
            if (!folderName) return;
            try {
              await vaultHandle.getDirectoryHandle(folderName, { create: true });
              await scanVault(vaultHandle);
            } catch {
              toast.error("Failed to create folder");
            }
          },
        }
      : null,
  );

  useRegisterCommand({
    id: "doc-info",
    label: "Document info — word count, score",
    shortcut: formatShortcut("I", { shift: true }),
    keywords: "word count tokens score structured stats",
    action: () => setIsDocInfoOpen((v) => !v),
  });

  useRegisterCommand(
    isAiConfigured
      ? {
          id: "ai-builder",
          label: "Open AI Builder",
          shortcut: formatShortcut("B", { shift: true }),
          keywords: "ai generate create revise section",
          action: () => setAiBuilderRequest((v) => v + 1),
        }
      : null,
  );

  useRegisterCommand({
    id: "focus-editor",
    label: "Focus editor",
    keywords: "writing surface",
    action: () => {
      const el = document.querySelector<HTMLTextAreaElement>(".editor-container textarea");
      el?.focus();
    },
  });

  const activeLeaf = activePaneId ? findLeaf(workspaceLayout.rootContainer, activePaneId) : null;

  useRegisterCommand(
    activeLeaf && activeLeaf.activeFilePath
      ? {
          id: "close-current-tab",
          label: "Close current tab",
          keywords: "close file",
          action: () => closeTab({ paneId: activeLeaf.id, filePath: activeLeaf.activeFilePath! }),
        }
      : null,
  );

  useRegisterCommand(
    activeLeaf && activeLeaf.openFilePaths.length > 0
      ? {
          id: "close-all-tabs",
          label: "Close all tabs",
          keywords: "close all files",
          action: () => {
            activeLeaf.openFilePaths.forEach((filePath) =>
              closeTab({ paneId: activeLeaf.id, filePath }),
            );
          },
        }
      : null,
  );

  return null;
}
