"use client";

import React from "react";
import {
  HiOutlinePlus,
  HiOutlineMicrophone,
  HiMicrophone,
  HiOutlineChatAlt2,
  HiOutlineCheckCircle,
  HiOutlineDotsHorizontal,
  HiOutlineDocumentAdd,
  HiOutlineFolderOpen,
  HiOutlineSearch,
  HiOutlineSave,
  HiOutlineHome,
  HiOutlineBookOpen,
  HiOutlineCog,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineLogout,
  HiOutlineClipboardCopy,
} from "react-icons/hi";
import { useAtom, useAtomValue } from "jotai";
import { atom_isAiBusy, atom_theme } from "@/app/atoms/atoms";
import { useCommandPalette } from "@/app/components/CommandPalette/CommandPaletteContext";
import { PanelLeaf } from "@/app/types/workspace";
import { usePaneFileActions } from "../hooks/use-pane-file-actions";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useDialog } from "@/app/hooks/use-dialog";
import { TabContextMenuItem } from "./TabContextMenu";
import MobileMoreSheet from "./MobileMoreSheet";

// Sits at the top of the screen rather than the bottom — the on-screen
// keyboard only ever eats into the bottom of the viewport, so a top rail
// never needs to dodge it or track visualViewport/keyboard inset (unlike a
// floating FAB, which would need the same treatment VoicePreviewPanel does).
//
// Always 3 or 5 icons, with Voice dead center — 4 reads lopsided and 3/5 are
// the conventional tab-bar counts. AI disabled: Tasks, Voice, More (3). AI
// enabled: New File, Tasks, Voice, AI Chat, More (5) — New File earns its
// slot back to keep the count symmetric around Voice, and folds back into
// "More" otherwise. "More" groups everything else into sections: file
// actions (Open Files/Search/Save), document tools (Doc Info/Vault
// Health/Copy Markdown/Close), app navigation (Home/Documentation/
// Settings/theme — mobile has no IconRail to hold these), and finally
// Close Vault, gated behind a confirm dialog and kept as a labeled row
// (never an icon-only button) since it sits in the same sheet a stray
// tap could otherwise land in.
export default function MobileControlRail({
  leaf,
  onFiles,
  onNewFile,
  onChat,
  onTasks,
  isChatAvailable,
  isVoiceSupported,
  isVoiceListening,
  onVoiceClick,
  onOpenSettings,
  onOpenDocumentation,
  onHome,
}: {
  leaf: PanelLeaf | null;
  onFiles: () => void;
  onNewFile: () => void;
  onChat?: () => void;
  onTasks: () => void;
  isChatAvailable?: boolean;
  isVoiceSupported?: boolean;
  isVoiceListening?: boolean;
  onVoiceClick?: () => void;
  onOpenSettings?: () => void;
  onOpenDocumentation?: () => void;
  onHome?: () => void;
}) {
  const { open: openCommandPalette } = useCommandPalette();
  const { handleSave, handleCopy, buildMoreMenuItems } = usePaneFileActions(leaf);
  const { vaultHandle, closeVault } = useFileSystem();
  const dialog = useDialog();
  const isAiBusy = useAtomValue(atom_isAiBusy);
  const [theme, setTheme] = useAtom(atom_theme);
  const [isMoreOpen, setIsMoreOpen] = React.useState(false);

  const hasActiveFile = !!leaf && leaf.openFilePaths.length > 0;

  const handleCloseVault = async () => {
    const confirmed = await dialog.confirm(
      "You can reopen it later — this just disconnects the current vault.",
      "Close this vault?",
      "Close Vault",
      "Cancel",
    );
    if (confirmed) closeVault();
  };

  // Grouped to match common editor "more" menus: file actions first
  // (Open Files/Search/Save/Copy Markdown — all act on the current file's
  // content), then document/vault metadata tools (Close Vault rides along
  // right after Vault Health, since that's the item it's most related to),
  // then app-level navigation/settings last — each group opens with a divider.
  const docToolsItems = hasActiveFile ? buildMoreMenuItems() : [];
  if (vaultHandle) {
    const vaultHealthIndex = docToolsItems.findIndex((item) => item.label === "Vault Health");
    const closeVaultItem: TabContextMenuItem = {
      label: "Close Vault",
      icon: <HiOutlineLogout size={16} />,
      onClick: () => { void handleCloseVault(); },
    };
    if (vaultHealthIndex >= 0) {
      docToolsItems.splice(vaultHealthIndex + 1, 0, closeVaultItem);
    } else {
      docToolsItems.push({ ...closeVaultItem, divider: true });
    }
  }

  const moreItems: TabContextMenuItem[] = [
    ...(isChatAvailable ? [] : [{ label: "New File", icon: <HiOutlineDocumentAdd size={16} />, onClick: onNewFile }]),
    { label: "Open File", icon: <HiOutlineFolderOpen size={16} />, onClick: onFiles },
    { label: "Search", icon: <HiOutlineSearch size={16} />, onClick: openCommandPalette },
    { label: "Save", icon: <HiOutlineSave size={16} />, onClick: () => { void handleSave(); } },
    ...(hasActiveFile ? [{ label: "Copy Markdown", icon: <HiOutlineClipboardCopy size={16} />, onClick: () => { void handleCopy(); } }] : []),
    ...docToolsItems,
    { label: "Home", icon: <HiOutlineHome size={16} />, divider: true, onClick: () => onHome?.() },
    { label: "Documentation", icon: <HiOutlineBookOpen size={16} />, onClick: () => onOpenDocumentation?.() },
    { label: "Settings", icon: <HiOutlineCog size={16} />, onClick: () => onOpenSettings?.() },
    {
      label: theme === "dark" ? "Light Mode" : "Dark Mode",
      icon: theme === "dark" ? <HiOutlineSun size={16} /> : <HiOutlineMoon size={16} />,
      onClick: () => setTheme(theme === "dark" ? "light" : "dark"),
    },
  ];

  return (
    <div className="sticky top-0 z-40 shrink-0 bg-chrome border-b border-edge-subtle h-14 pt-[env(safe-area-inset-top)]">
      <div className="h-full flex items-center justify-around">
        {isChatAvailable && (
          <button
            type="button"
            onClick={onNewFile}
            aria-label="New File"
            className="flex-1 h-full flex items-center justify-center text-fg-muted active:text-accent"
          >
            <HiOutlinePlus size={20} />
          </button>
        )}

        <button
          type="button"
          onClick={onTasks}
          aria-label="Tasks"
          className="flex-1 h-full flex items-center justify-center text-fg-muted active:text-accent"
        >
          <HiOutlineCheckCircle size={20} />
        </button>

        {isVoiceSupported && (
          <button
            type="button"
            onClick={() => onVoiceClick?.()}
            aria-label={isVoiceListening ? "Stop voice input" : "Start voice input"}
            aria-pressed={isVoiceListening}
            className="flex-1 h-full flex items-center justify-center"
          >
            <span
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                isVoiceListening ? "bg-accent text-white animate-pulse" : "bg-sage text-white active:bg-accent"
              }`}
            >
              {isVoiceListening ? <HiMicrophone size={18} /> : <HiOutlineMicrophone size={18} />}
            </span>
          </button>
        )}

        {isChatAvailable && (
          <button
            type="button"
            onClick={() => onChat?.()}
            aria-label="Open AI Chat"
            aria-pressed={isAiBusy}
            className={`flex-1 h-full flex items-center justify-center active:text-accent ${isAiBusy ? "text-accent animate-pulse" : "text-fg-muted"}`}
          >
            <HiOutlineChatAlt2 size={20} />
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsMoreOpen(true)}
          aria-label="More actions"
          className="flex-1 h-full flex items-center justify-center text-fg-muted active:text-accent"
        >
          <HiOutlineDotsHorizontal size={20} />
        </button>
      </div>

      <MobileMoreSheet
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        items={moreItems}
      />
    </div>
  );
}
