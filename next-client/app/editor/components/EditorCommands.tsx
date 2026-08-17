"use client";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useResolvedTheme } from "@/app/hooks/use-resolved-theme";
import { useRouter } from "next/navigation";
import { undo, redo } from "@codemirror/commands";
import {
  atom_workspaceLayout,
  atom_activePaneId,
  atom_closeTab,
  atom_splitPane,
  atom_closePane,
  atom_setPaneType,
  atom_wordWrap,
  atom_isWizardOpen,
  findLeaf,
} from "@/app/atoms/atoms";
import {
  atom_theme,
  atom_railPanel,
  atom_aiBuilderRequest,
  atom_isAiConfigured,
  atom_newVaultFlowOpen,
  atom_repurposeWizardOpen,
  atom_voiceInputRequest,
  atom_isVoiceInputListening,
  atom_isVoiceInputSupported,
  atom_showHiddenFiles,
  atom_activeEditorView,
  atom_tabsBarVisibleByDefault,
  atom_keyboardShortcutsOpen,
} from "@/app/atoms/ui-atoms";
import { atom_content, atom_activeFileHandle } from "@/app/atoms/file-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useDialog } from "@/app/hooks/use-dialog";
import toast from "react-hot-toast";
import { useRegisterCommand } from "@/app/components/CommandPalette/CommandPaletteContext";
import { formatShortcut } from "@/app/utils/platform";
import { usePaneFileActions } from "../hooks/use-pane-file-actions";

// Registers the app's global command-palette entries. Mounted once inside
// the editor route, alongside CommandPaletteProvider. Each command is a thin
// wrapper around an existing handler/atom — no new behavior, just a second
// entry point for it. Now also the sole home for actions that used to live
// only in MobileControlRail's "More" sheet (now retired) — Home,
// Documentation, Copy Markdown, Close Vault — plus mobile-aware branching
// for Open Files/Open Tasks, since mobile has no sidebar panel to drive.
export default function EditorCommands({
  onNewFile,
  onExport,
  onSave,
  isMobileChrome,
  onOpenMobileFiles,
  onOpenMobileTasks,
  onHome,
  onOpenDocumentation,
  onRefreshVault,
}: {
  onNewFile: () => void;
  onExport: () => void;
  onSave: () => void;
  isMobileChrome?: boolean;
  onOpenMobileFiles?: () => void;
  onOpenMobileTasks?: () => void;
  onHome: () => void;
  onOpenDocumentation: () => void;
  onRefreshVault?: () => void;
}) {
  const router = useRouter();
  const { openVault, vaultHandle, scanVault, indexVaultTags, closeVault, renameFile, deleteFile } = useFileSystem();
  const dialog = useDialog();
  const setTheme = useSetAtom(atom_theme);
  // Quick toggle always sets an explicit light/dark choice (not "system") —
  // the three-way picker for that lives in Settings.
  const theme = useResolvedTheme();
  const [showHiddenFiles, setShowHiddenFiles] = useAtom(atom_showHiddenFiles);
  const [railPanel, setRailPanel] = useAtom(atom_railPanel);
  const [, setAiBuilderRequest] = useAtom(atom_aiBuilderRequest);
  const [, setRepurposeWizardOpen] = useAtom(atom_repurposeWizardOpen);
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const content = useAtomValue(atom_content);
  const workspaceLayout = useAtomValue(atom_workspaceLayout);
  const activePaneId = useAtomValue(atom_activePaneId);
  const [, closeTab] = useAtom(atom_closeTab);
  const [, setNewVaultFlowOpen] = useAtom(atom_newVaultFlowOpen);
  const [, setVoiceInputRequest] = useAtom(atom_voiceInputRequest);
  const isVoiceListening = useAtomValue(atom_isVoiceInputListening);
  const isVoiceSupported = useAtomValue(atom_isVoiceInputSupported);
  const [, splitPane] = useAtom(atom_splitPane);
  const [, closePane] = useAtom(atom_closePane);
  const [, setPaneType] = useAtom(atom_setPaneType);
  const [wordWrap, setWordWrap] = useAtom(atom_wordWrap);
  const [tabsBarVisibleByDefault, setTabsBarVisibleByDefault] = useAtom(atom_tabsBarVisibleByDefault);
  const [, setIsWizardOpen] = useAtom(atom_isWizardOpen);
  const [, setKeyboardShortcutsOpen] = useAtom(atom_keyboardShortcutsOpen);
  const activeFileHandle = useAtomValue(atom_activeFileHandle);
  const activeEditorView = useAtomValue(atom_activeEditorView);
  const activeLeaf = activePaneId ? findLeaf(workspaceLayout.rootContainer, activePaneId) : null;
  const isOnlyPane = "type" in workspaceLayout.rootContainer;
  const { filePath: activeFilePath, handleCopy, closeTabWithAutosave } = usePaneFileActions(activeLeaf);

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
    id: "toggle-sidebar",
    label: railPanel !== null ? "Collapse sidebar" : "Expand sidebar",
    shortcut: formatShortcut("E", { shift: true }),
    keywords: "sidebar collapse expand explorer files",
    action: () => setRailPanel((prev) => (prev !== null ? null : "files")),
  });

  useRegisterCommand({
    id: "open-files-panel",
    label: "Open Files",
    keywords: "files browse explorer sidebar",
    action: () => (isMobileChrome ? onOpenMobileFiles?.() : setRailPanel("files")),
  });

  useRegisterCommand({
    id: "open-search-panel",
    label: "Search",
    keywords: "find files search sidebar",
    action: () => setRailPanel("search"),
  });

  useRegisterCommand({
    id: "open-tags-panel",
    label: "Open Tags",
    keywords: "tags sidebar browse",
    action: () => setRailPanel("tags"),
  });

  useRegisterCommand({
    id: "open-views-panel",
    label: "Open Views",
    keywords: "views smart workspaces sidebar",
    action: () => setRailPanel("views"),
  });

  useRegisterCommand({
    id: "open-tasks-panel",
    label: "Open Tasks",
    keywords: "tasks todos sidebar",
    action: () => (isMobileChrome ? onOpenMobileTasks?.() : setRailPanel("tasks")),
  });

  useRegisterCommand(
    activeLeaf
      ? {
          id: "split-pane-right",
          label: "Split Right",
          keywords: "split pane layout workspace",
          action: () => splitPane({ id: activeLeaf.id, direction: "horizontal" }),
        }
      : null,
  );

  useRegisterCommand(
    activeLeaf && !isOnlyPane
      ? {
          id: "close-pane",
          label: "Close Pane",
          keywords: "close pane layout workspace",
          action: () => closePane(activeLeaf.id),
        }
      : null,
  );

  // Preview mode removed — no toggle command registered.

  useRegisterCommand(
    activeLeaf && activeLeaf.openFilePaths.length > 1
      ? {
          id: "close-other-tabs",
          label: "Close other tabs",
          keywords: "close tabs files",
          action: () => {
            for (const p of activeLeaf.openFilePaths) {
              if (p !== activeFilePath) void closeTabWithAutosave(p);
            }
          },
        }
      : null,
  );

  useRegisterCommand({
    id: "toggle-theme",
    label: theme === "dark" ? "Switch to light theme" : "Switch to dark theme",
    keywords: "dark light theme appearance",
    action: () => setTheme(theme === "dark" ? "light" : "dark"),
  });

  useRegisterCommand({
    id: "toggle-hidden-files",
    label: showHiddenFiles ? "Hide hidden files" : "Show hidden files",
    keywords: "hidden dotfiles skills files sidebar reveal",
    action: () => {
      const next = !showHiddenFiles;
      setShowHiddenFiles(next);
      if (!vaultHandle) return;
      scanVault(vaultHandle as any, next);
      indexVaultTags?.(vaultHandle as any, next);
    },
  });

  useRegisterCommand({
    id: "show-keyboard-shortcuts",
    label: "Show keyboard shortcuts",
    keywords: "shortcuts hotkeys keybindings help",
    action: () => setKeyboardShortcutsOpen(true),
  });

  useRegisterCommand({
    id: "open-settings",
    label: "Open settings",
    keywords: "preferences config",
    action: () => router.push("/editor/settings"),
  });

  useRegisterCommand({
    id: "toggle-word-wrap",
    label: wordWrap ? "Disable word wrap" : "Enable word wrap",
    keywords: "wrap line editor",
    action: () => setWordWrap(!wordWrap),
  });

  useRegisterCommand({
    id: "toggle-tabs-bar-default",
    label: tabsBarVisibleByDefault ? "Hide tabs bar by default" : "Show tabs bar by default",
    keywords: "tabs bar pane visible default settings",
    action: () => setTabsBarVisibleByDefault(!tabsBarVisibleByDefault),
  });

  useRegisterCommand({
    id: "start-welcome-tour",
    label: "Start welcome tour",
    keywords: "onboarding guide help tour walkthrough",
    action: () => {
      setIsWizardOpen(true);
      router.push("/editor");
    },
  });

  useRegisterCommand(
    isVoiceSupported
      ? {
          id: "toggle-voice-input",
          label: isVoiceListening ? "Stop voice input" : "Start voice input",
          shortcut: formatShortcut("V", { shift: true }),
          keywords: "voice mic dictate speak",
          action: () => setVoiceInputRequest((v) => v + 1),
        }
      : null,
  );

  useRegisterCommand({
    id: "go-home",
    label: "Home",
    keywords: "home vault switcher",
    action: onHome,
  });

  useRegisterCommand({
    id: "open-documentation",
    label: "Documentation",
    keywords: "docs help guide",
    action: onOpenDocumentation,
  });

  useRegisterCommand(
    vaultHandle
      ? {
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
        }
      : null,
  );

  useRegisterCommand(
    activeLeaf && activeLeaf.openFilePaths.length > 0
      ? {
          id: "copy-markdown",
          label: "Copy Markdown",
          keywords: "copy clipboard content",
          action: () => { void handleCopy(); },
        }
      : null,
  );

  useRegisterCommand(
    activeFileHandle
      ? {
          id: "rename-current-file",
          label: "Rename current file",
          keywords: "rename move file",
          action: () => renameFile(activeFileHandle),
        }
      : null,
  );

  useRegisterCommand(
    activeFileHandle
      ? {
          id: "delete-current-file",
          label: "Delete current file",
          keywords: "delete remove trash file",
          action: () => deleteFile(activeFileHandle, activeFilePath),
        }
      : null,
  );

  useRegisterCommand(
    vaultHandle && onRefreshVault
      ? {
          id: "refresh-vault",
          label: "Refresh vault",
          keywords: "rescan reload vault files",
          action: () => onRefreshVault(),
        }
      : null,
  );

  useRegisterCommand({
    id: "create-new-vault",
    label: "Create new vault",
    keywords: "vault new folder",
    action: () => setNewVaultFlowOpen(true),
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

  useRegisterCommand(
    isAiConfigured
      ? {
          id: "ai-builder",
          label: "Open AI Chat",
          shortcut: formatShortcut("B", { shift: true }),
          keywords: "ai chat generate create revise section ask",
          action: () => setAiBuilderRequest((v) => v + 1),
        }
      : null,
  );

  useRegisterCommand(
    isAiConfigured && content.trim()
      ? {
          id: "repurpose-note",
          label: "Repurpose note into blog / social / newsletter draft…",
          keywords: "repurpose content creator blog social newsletter draft format",
          action: () => setRepurposeWizardOpen(true),
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

  useRegisterCommand(
    activeEditorView
      ? {
          id: "undo-edit",
          label: "Undo",
          keywords: "undo revert history",
          action: () => undo(activeEditorView),
        }
      : null,
  );

  useRegisterCommand(
    activeEditorView
      ? {
          id: "redo-edit",
          label: "Redo",
          keywords: "redo history",
          action: () => redo(activeEditorView),
        }
      : null,
  );

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
