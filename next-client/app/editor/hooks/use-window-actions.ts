import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import { atom_activePaneId, atom_workspaceLayout } from "@/app/atoms/atoms";
import { atom_aiBuilderRequest, atom_isAiConfigured, atom_sidebarOpen, atom_toolbarVisible } from "@/app/atoms/ui-atoms";
import { atom_pinnedNotePaths, atom_toggleNotePin } from "@/app/atoms/note-pin-atoms";
import { findLeaf } from "@/app/atoms/utils";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { useCommandPalette } from "@/app/components/CommandPalette/CommandPaletteContext";
import { exportActiveHtml, exportActivePdf } from "../utils/open-helper-dialogs";
import { usePaneFileActions } from "./use-pane-file-actions";

// The window-wide toolbar commands: the toolbar's Tools section, its More
// menu (which acts on the focused pane) and its context menu.
export function useWindowActions() {
  const router = useRouter();
  const { open: openCommandPalette } = useCommandPalette();
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const setAiBuilderRequest = useSetAtom(atom_aiBuilderRequest);
  const [sidebarOpen, setSidebarOpen] = useAtom(atom_sidebarOpen);
  const setToolbarVisible = useSetAtom(atom_toolbarVisible);
  const workspaceLayout = useAtomValue(atom_workspaceLayout);
  const activePaneId = useAtomValue(atom_activePaneId);
  const activeLeaf = activePaneId ? findLeaf(workspaceLayout.rootContainer, activePaneId) : null;
  const { handleCopy } = usePaneFileActions(activeLeaf);
  const activePaneHasFiles = !!activeLeaf && activeLeaf.openFilePaths.length > 0;
  // The focused pane's note, when it can be pinned to Home: in the open
  // vault, not the draft.
  const hasVault = !!useAtomValue(atom_vaultHandle);
  const pinnedNotePaths = useAtomValue(atom_pinnedNotePaths);
  const toggleNotePin = useSetAtom(atom_toggleNotePin);
  const pinnablePath = hasVault && activeLeaf?.activeFilePath && activeLeaf.activeFilePath !== "draft" ? activeLeaf.activeFilePath : null;

  return {
    isAiConfigured,
    sidebarOpen,
    activePaneHasFiles,
    canPinActiveNote: !!pinnablePath,
    isActiveNotePinned: !!pinnablePath && pinnedNotePaths.includes(pinnablePath),
    toggleActiveNotePin: () => { if (pinnablePath) toggleNotePin(pinnablePath); },
    openCommandPalette: () => openCommandPalette(),
    // Same trigger as the Ctrl/Cmd+Shift+B shortcut; the editor page opens the chat.
    openAIChat: () => setAiBuilderRequest((value) => value + 1),
    openSettings: () => router.push("/editor/settings"),
    openHelp: () => router.push("/documentation"),
    toggleSidebar: () => setSidebarOpen(!sidebarOpen),
    hideToolbar: () => setToolbarVisible(false),
    copyActiveMarkdown: () => void handleCopy(),
    exportActivePdf,
    exportActiveHtml,
  };
}
