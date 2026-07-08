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
  atom_isVaultHealthOpen,
  atom_aiBuilderRequest,
  atom_isAiConfigured,
  atom_newVaultFlowOpen,
  atom_repurposeWizardOpen,
  atom_voiceWizardOpen,
} from "@/app/atoms/ui-atoms";
import { atom_content } from "@/app/atoms/file-atoms";
import { atom_isDriveVault, atom_driveVaultId } from "@/app/atoms/drive-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useDialog } from "@/app/hooks/use-dialog";
import toast from "react-hot-toast";
import { showSuccessToast, showErrorToast } from "@/app/components/Toastr";
import { openOrCreateVoiceMd } from "@/app/services/vault-schema";
import { useVoiceMdStatus } from "../hooks/use-voice-md-status";
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
  const { openVault, vaultHandle, scanVault, openFile } = useFileSystem();
  const dialog = useDialog();
  const [theme, setTheme] = useAtom(atom_theme);
  const [railPanel, setRailPanel] = useAtom(atom_railPanel);
  const [, setIsDocInfoOpen] = useAtom(atom_isDocInfoOpen);
  const [, setIsVaultHealthOpen] = useAtom(atom_isVaultHealthOpen);
  const [, setAiBuilderRequest] = useAtom(atom_aiBuilderRequest);
  const [, setRepurposeWizardOpen] = useAtom(atom_repurposeWizardOpen);
  const [, setVoiceWizardOpen] = useAtom(atom_voiceWizardOpen);
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const isDriveVault = useAtomValue(atom_isDriveVault);
  const driveVaultId = useAtomValue(atom_driveVaultId);
  const voiceMdExists = useVoiceMdStatus();
  const content = useAtomValue(atom_content);
  const workspaceLayout = useAtomValue(atom_workspaceLayout);
  const activePaneId = useAtomValue(atom_activePaneId);
  const [, closeTab] = useAtom(atom_closeTab);
  const [, setNewVaultFlowOpen] = useAtom(atom_newVaultFlowOpen);

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
    id: "create-new-vault",
    label: "Create new vault",
    keywords: "vault new folder starter pack",
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

  useRegisterCommand({
    id: "doc-info",
    label: "Document info — word count, score",
    shortcut: formatShortcut("I", { shift: true }),
    keywords: "word count tokens score structured stats",
    action: () => setIsDocInfoOpen((v) => !v),
  });

  useRegisterCommand({
    id: "vault-health",
    label: "Vault health score",
    keywords: "health score stats orphan broken links frontmatter tokens",
    action: () => setIsVaultHealthOpen((v) => !v),
  });

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
    vaultHandle || (isDriveVault && driveVaultId)
      ? {
          id: "create-voice-md",
          label: voiceMdExists ? "Voice & Tone: Edit voice.md" : "Voice & Tone: Create voice.md",
          keywords: "voice profile tone audience create new edit",
          action: async () => {
            try {
              const { opened } = await openOrCreateVoiceMd({ vaultHandle, isDriveVault, driveVaultId, openFile });
              if (!opened) showSuccessToast("voice.md created.");
            } catch (err: any) {
              showErrorToast(err.message || "Failed to create voice.md.");
            }
          },
        }
      : null,
  );

  useRegisterCommand(
    isAiConfigured && (vaultHandle || (isDriveVault && driveVaultId))
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
