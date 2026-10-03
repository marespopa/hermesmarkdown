"use client";

import React, { useRef, useState } from "react";
import {
  HiOutlineChatAlt2,
  HiOutlineChevronUp,
  HiOutlineClipboardCopy,
  HiOutlineCog,
  HiOutlineDotsHorizontal,
  HiOutlineQuestionMarkCircle,
  HiOutlineSearch,
  HiOutlineViewBoards,
} from "react-icons/hi";
import { formatShortcut } from "@/app/utils/platform";
import { useWindowActions } from "../hooks/use-window-actions";
import PaneModeSwitch from "./PaneModeSwitch";
import PaneToolbarButton from "./PaneToolbarButton";
import TabContextMenu from "./TabContextMenu";
import { PANE_ICON_SIZE, PANE_SECTION_CLASS } from "./pane-header-classes";

// Window-wide toolbar sections. They change the whole app, not one pane, so
// `PaneLeaf` renders them once — in the top-right pane's header — where they
// stay put while focus moves between panes. Each section is its own capsule:
// - Mode: the Edit / Preview switch.
// - Tools: command palette and AI chat.
// - More: a pull-down menu with the secondary commands (Copy Markdown and
//   Split Right for the focused pane, Settings, Help, Hide Toolbar).
export default function PaneWindowActions() {
  const actions = useWindowActions();
  const moreRef = useRef<HTMLButtonElement>(null);
  const [moreMenu, setMoreMenu] = useState<{ x: number; y: number } | null>(null);

  const openMoreMenu = () => {
    const rect = moreRef.current?.getBoundingClientRect();
    // Right-aligned under the button; the menu clamps itself to the viewport.
    setMoreMenu({ x: rect ? rect.right - 220 : 0, y: rect ? rect.bottom + 6 : 0 });
  };

  return (
    <div className="flex items-center shrink-0" role="toolbar" aria-label="Window">
      <div className={PANE_SECTION_CLASS} role="group" aria-label="Mode">
        {/* Inside the section the switch drops its own track: the section's
            fill is the track, and the selected segment rides on it. */}
        <div className="flex items-center px-0.5">
          <PaneModeSwitch iconOnly className="!bg-transparent !border-0 !p-0" />
        </div>
      </div>

      <div className={PANE_SECTION_CLASS} role="group" aria-label="Tools">
        <PaneToolbarButton
          icon={<HiOutlineSearch size={PANE_ICON_SIZE} />}
          label="Search"
          tooltip="Command palette"
          aria-label="Command palette"
          shortcut={formatShortcut("K")}
          onClick={actions.openCommandPalette}
        />
        {actions.isAiConfigured && (
          <PaneToolbarButton
            icon={<HiOutlineChatAlt2 size={PANE_ICON_SIZE} />}
            label="AI Chat"
            shortcut={formatShortcut("B", { shift: true })}
            onClick={actions.openAIChat}
          />
        )}
      </div>

      <div className={PANE_SECTION_CLASS} role="group" aria-label="More">
        <PaneToolbarButton
          ref={moreRef}
          icon={<HiOutlineDotsHorizontal size={PANE_ICON_SIZE} />}
          label="More"
          tooltipPosition="bottom-end"
          aria-haspopup="menu"
          aria-expanded={!!moreMenu}
          active={!!moreMenu}
          onClick={(event) => {
            event.stopPropagation();
            if (moreMenu) setMoreMenu(null);
            else openMoreMenu();
          }}
        />
      </div>

      {moreMenu && (
        <TabContextMenu
          x={moreMenu.x}
          y={moreMenu.y}
          label="More"
          // The More button toggles the menu itself; its presses aren't outside clicks.
          anchorRef={moreRef}
          onClose={() => setMoreMenu(null)}
          items={[
            { label: "Copy Markdown", icon: <HiOutlineClipboardCopy size={15} />, disabled: !actions.activePaneHasFiles, onClick: actions.copyActiveMarkdown },
            { label: "Split Right", icon: <HiOutlineViewBoards size={15} />, disabled: !actions.activePaneHasFiles, onClick: actions.splitActivePaneRight },
            { label: "Settings", icon: <HiOutlineCog size={15} />, divider: true, onClick: actions.openSettings },
            { label: "Documentation and Help", icon: <HiOutlineQuestionMarkCircle size={15} />, onClick: actions.openHelp },
            { label: "Hide Toolbar", icon: <HiOutlineChevronUp size={15} />, divider: true, shortcut: formatShortcut("T", { alt: true }), onClick: actions.hideToolbar },
          ]}
        />
      )}
    </div>
  );
}
