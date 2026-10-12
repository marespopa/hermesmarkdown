import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import { atom_activePaneId, atom_workspaceLayout } from "@/app/atoms/atoms";
import { atom_aiBuilderRequest, atom_isAiConfigured, atom_sidebarOpen } from "@/app/atoms/ui-atoms";
import { findLeaf } from "@/app/atoms/utils";
import { useCommandPalette } from "@/app/components/CommandPalette/CommandPaletteContext";
import { exportActivePdf } from "../utils/open-helper-dialogs";
import { usePaneFileActions } from "./use-pane-file-actions";

// The window-wide toolbar commands: the toolbar's Tools section, its More
// menu (which acts on the focused pane) and its context menu.
export function useWindowActions() {
  const router = useRouter();
  const { open: openCommandPalette } = useCommandPalette();
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const setAiBuilderRequest = useSetAtom(atom_aiBuilderRequest);
  const [sidebarOpen, setSidebarOpen] = useAtom(atom_sidebarOpen);
  const workspaceLayout = useAtomValue(atom_workspaceLayout);
  const activePaneId = useAtomValue(atom_activePaneId);
  const activeLeaf = activePaneId ? findLeaf(workspaceLayout.rootContainer, activePaneId) : null;
  const { handleCopy } = usePaneFileActions(activeLeaf);
  const activePaneHasFiles = !!activeLeaf && activeLeaf.openFilePaths.length > 0;

  return {
    isAiConfigured,
    sidebarOpen,
    activePaneHasFiles,
    openCommandPalette: () => openCommandPalette(),
    // Same trigger as the Ctrl/Cmd+Shift+B shortcut; the editor page opens the chat.
    openAIChat: () => setAiBuilderRequest((value) => value + 1),
    openSettings: () => router.push("/editor/settings"),
    openHelp: () => router.push("/documentation"),
    toggleSidebar: () => setSidebarOpen(!sidebarOpen),
    copyActiveMarkdown: () => void handleCopy(),
    exportActivePdf,
  };
}
