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
  atom_aiBuilderRequest,
  atom_isAiConfigured,
  atom_newVaultFlowOpen,
  atom_repurposeWizardOpen,
  atom_voiceWizardOpen,
  atom_voiceInputRequest,
  atom_isVoiceInputListening,
  atom_isVoiceInputSupported,
} from "@/app/atoms/ui-atoms";
import { atom_content } from "@/app/atoms/file-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useDialog } from "@/app/hooks/use-dialog";
import toast from "react-hot-toast";
import { showSuccessToast, showErrorToast } from "@/app/components/Toastr";
import { openOrCreateVoiceMd } from "@/app/services/vault-schema";
import { useVoiceMdStatus } from "../hooks/use-voice-md-status";
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
}: {
  onNewFile: () => void;
  onExport: () => void;
  onSave: () => void;
  isMobileChrome?: boolean;
  onOpenMobileFiles?: () => void;
  onOpenMobileTasks?: () => void;
  onHome: () => void;
  onOpenDocumentation: () => void;
}) {
  const router = useRouter();
  const { openVault, vaultHandle, scanVault, openFile, closeVault } = useFileSystem();
  const dialog = useDialog();
  const [theme, setTheme] = useAtom(atom_theme);
  const [railPanel, setRailPanel] = useAtom(atom_railPanel);
  const [, setAiBuilderRequest] = useAtom(atom_aiBuilderRequest);
  const [, setRepurposeWizardOpen] = useAtom(atom_repurposeWizardOpen);
  const [, setVoiceWizardOpen] = useAtom(atom_voiceWizardOpen);
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const voiceMdExists = useVoiceMdStatus();
  const content = useAtomValue(atom_content);
  const workspaceLayout = useAtomValue(atom_workspaceLayout);
  const activePaneId = useAtomValue(atom_activePaneId);
  const [, closeTab] = useAtom(atom_closeTab);
  const [, setNewVaultFlowOpen] = useAtom(atom_newVaultFlowOpen);
  const [, setVoiceInputRequest] = useAtom(atom_voiceInputRequest);
  const isVoiceListening = useAtomValue(atom_isVoiceInputListening);
  const isVoiceSupported = useAtomValue(atom_isVoiceInputSupported);
  const activeLeaf = activePaneId ? findLeaf(workspaceLayout.rootContainer, activePaneId) : null;
  const { handleCopy } = usePaneFileActions(activeLeaf);

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
          keywords: "disconnect vault switch",
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
    vaultHandle
      ? {
          id: "create-voice-md",
          label: voiceMdExists ? "Voice & Tone: Edit voice.md" : "Voice & Tone: Create voice.md",
          keywords: "voice profile tone audience create new edit",
          action: async () => {
            try {
              const { opened } = await openOrCreateVoiceMd({ vaultHandle, openFile });
              if (!opened) showSuccessToast("voice.md created.");
            } catch (err: any) {
              showErrorToast(err.message || "Failed to create voice.md.");
            }
          },
        }
      : null,
  );

  useRegisterCommand(
    isAiConfigured && vaultHandle
      ? {
          id: "draft-voice-md",
          label: "Voice & Tone: Draft voice.md from notes…",
          keywords: "voice profile tone audience draft generate ai",
          action: () => setVoiceWizardOpen(true),
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
