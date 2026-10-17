"use client";

import React, { useRef, useState } from "react";
import {
  HiOutlineChatAlt2,
  HiOutlineChevronUp,
  HiOutlineClipboardCopy,
  HiOutlineCode,
  HiOutlineCog,
  HiOutlineDocumentDownload,
  HiOutlineDotsHorizontal,
  HiOutlineQuestionMarkCircle,
} from "react-icons/hi";
import { TbPinned, TbPinnedFilled } from "react-icons/tb";
import { formatShortcut } from "@/app/utils/platform";
import { useWindowActions } from "../hooks/use-window-actions";
import PaneToolbarButton from "./PaneToolbarButton";
import TabContextMenu from "./TabContextMenu";
import { PANE_ICON_SIZE, PANE_SECTION_CLASS } from "./pane-header-classes";

// Window-wide toolbar sections. They change the whole app, not one pane, so
// `PaneLeaf` renders them once — in the top-right pane's header — where they
// stay put while focus moves between panes. Each section is its own capsule:
// - AI chat, when it's set up. The command palette, the app's main way in,
//   opens from the pane's title (PaneTitle) and Ctrl/Cmd+K.
// - More: a pull-down menu with the secondary commands (Copy Markdown,
//   Export as PDF, Export as HTML and Pin Note / Unpin Note for the
//   focused pane, Settings, Documentation). Split panes and Token Cost are
//   palette commands.
// - Hide toolbar, last: tucks the whole bar away (remembered); PaneLeaf
//   then shows a Show toolbar button in the same corner.
export default function PaneWindowActions() {
  const actions = useWindowActions();
  const moreRef = useRef<HTMLButtonElement>(null);
  const [moreMenu, setMoreMenu] = useState<{ x: number; y: number } | null>(null);

  const openMoreMenu = () => {
    const rect = moreRef.current?.getBoundingClientRect();
    // Right-aligned under the button (align="end"); the menu clamps itself to the viewport.
    setMoreMenu({ x: rect ? rect.right : 0, y: rect ? rect.bottom + 6 : 0 });
  };

  return (
    <div className="flex items-center shrink-0" role="toolbar" aria-label="Window">
      {actions.isAiConfigured && (
        <div className={PANE_SECTION_CLASS} role="group" aria-label="Tools">
          <PaneToolbarButton
            icon={<HiOutlineChatAlt2 size={PANE_ICON_SIZE} />}
            label="AI Chat"
            shortcut={formatShortcut("B", { shift: true })}
            onClick={actions.openAIChat}
          />
        </div>
      )}

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

      <div className={PANE_SECTION_CLASS} role="group" aria-label="Toolbar">
        <PaneToolbarButton
          icon={<HiOutlineChevronUp size={PANE_ICON_SIZE} />}
          label="Hide toolbar"
          shortcut={formatShortcut("\\", { shift: true })}
          tooltipPosition="bottom-end"
          onClick={actions.hideToolbar}
        />
      </div>

      {moreMenu && (
        <TabContextMenu
          x={moreMenu.x}
          y={moreMenu.y}
          label="More"
          align="end"
          // The More button toggles the menu itself; its presses aren't outside clicks.
          anchorRef={moreRef}
          onClose={() => setMoreMenu(null)}
          items={[
            { label: "Copy Markdown", icon: <HiOutlineClipboardCopy size={15} />, disabled: !actions.activePaneHasFiles, onClick: actions.copyActiveMarkdown },
            { label: "Export as PDF", icon: <HiOutlineDocumentDownload size={15} />, disabled: !actions.activePaneHasFiles, onClick: actions.exportActivePdf },
            { label: "Export as HTML", icon: <HiOutlineCode size={15} />, disabled: !actions.activePaneHasFiles, onClick: actions.exportActiveHtml },
            // Its label and filled pin say whether the open note is pinned.
            ...(actions.canPinActiveNote
              ? [{
                  label: actions.isActiveNotePinned ? "Unpin Note" : "Pin Note",
                  icon: actions.isActiveNotePinned ? <TbPinnedFilled size={15} className="text-accent" /> : <TbPinned size={15} />,
                  onClick: actions.toggleActiveNotePin,
                }]
              : []),
            { label: "Settings", icon: <HiOutlineCog size={15} />, divider: true, onClick: actions.openSettings },
            { label: "Documentation", icon: <HiOutlineQuestionMarkCircle size={15} />, onClick: actions.openHelp },
          ]}
        />
      )}
    </div>
  );
}
