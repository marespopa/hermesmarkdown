"use client";

import React from "react";
import { HiOutlinePlus, HiOutlineMicrophone, HiMicrophone, HiOutlineChatAlt2, HiOutlineCheckCircle, HiOutlineDotsHorizontal } from "react-icons/hi";
import { useAtomValue } from "jotai";
import { atom_isAiBusy } from "@/app/atoms/atoms";
import { useCommandPalette } from "@/app/components/CommandPalette/CommandPaletteContext";
import { PanelLeaf } from "@/app/types/workspace";
import { usePaneFileActions } from "../hooks/use-pane-file-actions";
import TabContextMenu, { TabContextMenuItem } from "./TabContextMenu";

// Sits at the top of the screen rather than the bottom — the on-screen
// keyboard only ever eats into the bottom of the viewport, so a top rail
// never needs to dodge it or track visualViewport/keyboard inset (unlike a
// floating FAB, which would need the same treatment VoicePreviewPanel does).
//
// Always 3 or 5 icons, with Voice dead center — 4 reads lopsided and 3/5 are
// the conventional tab-bar counts. AI disabled: Tasks, Voice, More (3). AI
// enabled: New File, Tasks, Voice, AI Chat, More (5) — New File earns its
// slot back to keep the count symmetric around Voice, and folds back into
// "More" otherwise. "More" also holds Open Files, Search (the filename
// dropdown already covers the common case of finding an open/recent file),
// Save (autosave is the default, so manual save is a fallback action), Doc
// Info, Vault Health, Copy Markdown, Close.
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
}) {
  const { open: openCommandPalette } = useCommandPalette();
  const { handleSave, buildMoreMenuItems } = usePaneFileActions(leaf);
  const isAiBusy = useAtomValue(atom_isAiBusy);
  const [moreMenu, setMoreMenu] = React.useState<{ x: number; y: number } | null>(null);

  const hasActiveFile = !!leaf && leaf.openFilePaths.length > 0;

  const moreItems: TabContextMenuItem[] = [
    ...(isChatAvailable ? [] : [{ label: "New File", onClick: onNewFile }]),
    { label: "Open Files", onClick: onFiles },
    { label: "Search", onClick: openCommandPalette },
    { label: "Save", onClick: () => { void handleSave(); } },
    ...(hasActiveFile ? buildMoreMenuItems(leaf!.activeFilePath || "draft") : []),
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
          onClick={(e) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setMoreMenu({ x: rect.right - 8, y: rect.bottom + 4 });
          }}
          aria-label="More actions"
          className="flex-1 h-full flex items-center justify-center text-fg-muted active:text-accent"
        >
          <HiOutlineDotsHorizontal size={20} />
        </button>
      </div>

      {moreMenu && (
        <TabContextMenu
          x={moreMenu.x}
          y={moreMenu.y}
          items={moreItems}
          onClose={() => setMoreMenu(null)}
        />
      )}
    </div>
  );
}
