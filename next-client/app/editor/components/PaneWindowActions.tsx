"use client";

import React from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import { HiOutlineChatAlt2, HiOutlineChevronUp, HiOutlineCog, HiOutlineQuestionMarkCircle, HiOutlineSearch } from "react-icons/hi";
import { atom_aiBuilderRequest, atom_isAiConfigured, atom_toolbarHidden } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import Tooltip from "@/app/components/Tooltip";
import { useCommandPalette } from "@/app/components/CommandPalette/CommandPaletteContext";
import { formatShortcut } from "@/app/utils/platform";
import PaneModeSwitch from "./PaneModeSwitch";
import FrontmatterToggle from "./FrontmatterToggle";
import { PANE_ACTION_BUTTON_CLASS, PANE_ACTIONS_CLASS, PANE_DIVIDER_CLASS, PANE_ICON_SIZE } from "./pane-header-classes";

// Window-wide toolbar actions: view options (Edit / Preview, metadata) and
// app commands (command palette, AI chat, settings, documentation). They change the whole
// app, not one pane, so `PaneLeaf` renders them once — in the top-right
// pane's header — where they stay put while focus moves between panes.
export default function PaneWindowActions() {
  const router = useRouter();
  const { open: openCommandPalette } = useCommandPalette();
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const setAiBuilderRequest = useSetAtom(atom_aiBuilderRequest);
  // Same trigger as the Ctrl/Cmd+Shift+B shortcut; the editor page opens the chat.
  const openAIChat = () => setAiBuilderRequest((value) => value + 1);
  const setToolbarHidden = useSetAtom(atom_toolbarHidden);

  return (
    <div className={PANE_ACTIONS_CLASS} role="toolbar" aria-label="Window">
      <PaneModeSwitch iconOnly />
      <FrontmatterToggle className={PANE_ACTION_BUTTON_CLASS} size={PANE_ICON_SIZE} />
      <div className={PANE_DIVIDER_CLASS} />
      <Tooltip label="Command palette" shortcut={formatShortcut("K")}>
        <Button
          variant="icon"
          onClick={() => openCommandPalette()}
          aria-label="Command palette"
          className={PANE_ACTION_BUTTON_CLASS}
        >
          <HiOutlineSearch size={PANE_ICON_SIZE} />
        </Button>
      </Tooltip>
      {isAiConfigured && (
        <Tooltip label="AI Chat" shortcut={formatShortcut("B", { shift: true })}>
          <Button
            variant="icon"
            onClick={openAIChat}
            aria-label="AI Chat"
            className={PANE_ACTION_BUTTON_CLASS}
          >
            <HiOutlineChatAlt2 size={PANE_ICON_SIZE} />
          </Button>
        </Tooltip>
      )}
      <Tooltip label="Settings">
        <Button
          variant="icon"
          onClick={() => router.push("/editor/settings")}
          aria-label="Settings"
          className={PANE_ACTION_BUTTON_CLASS}
        >
          <HiOutlineCog size={PANE_ICON_SIZE} />
        </Button>
      </Tooltip>
      <Tooltip label="Documentation and help" position="bottom-end">
        <Button
          variant="icon"
          onClick={() => router.push("/documentation")}
          aria-label="Documentation and help"
          className={PANE_ACTION_BUTTON_CLASS}
        >
          <HiOutlineQuestionMarkCircle size={PANE_ICON_SIZE} />
        </Button>
      </Tooltip>
      <div className={PANE_DIVIDER_CLASS} />
      <Tooltip label="Hide toolbar" shortcut={formatShortcut("T", { alt: true })} position="bottom-end">
        <Button
          variant="icon"
          onClick={() => setToolbarHidden(true)}
          aria-label="Hide toolbar"
          className={PANE_ACTION_BUTTON_CLASS}
        >
          <HiOutlineChevronUp size={PANE_ICON_SIZE} />
        </Button>
      </Tooltip>
    </div>
  );
}
