"use client";

import React from "react";
import { HiOutlineXCircle } from "react-icons/hi";
import { formatShortcut } from "@/app/utils/platform";
import { SaveStateIcon, TabSaveState, statusMeta } from "./PaneTab";
import PaneToolbarButton, { useToolbarMode } from "./PaneToolbarButton";
import { PANE_ICON_SIZE, PANE_SECTION_CLASS } from "./pane-header-classes";

interface PaneActionsProps {
  hasFiles: boolean;
  saveState: TabSaveState;
  saveErrorMessage?: string;
  /** Close Pane, only while the window is split. */
  showClose: boolean;
  onSave: () => void;
  onClosePane: () => void;
}

// One pane's own toolbar section: Save, and Close Pane while the window is
// split. Rendered in every pane, focused or not, so the toolbar never reflows
// when focus moves. Copy Markdown and Split Right live in the toolbar's More
// menu and act on the focused pane.
export default function PaneActions({ hasFiles, saveState, saveErrorMessage, showClose, onSave, onClosePane }: PaneActionsProps) {
  const mode = useToolbarMode();
  const saveMeta = statusMeta[saveState];

  return (
    <div className={PANE_SECTION_CLASS[mode]} role="toolbar" aria-label="Pane">
      <PaneToolbarButton
        // Colored on the icon, not the Button, so the save state's color
        // wins over the button's own text color in every state.
        icon={
          <SaveStateIcon
            state={saveState}
            size={PANE_ICON_SIZE}
            className={saveState === "idle" ? undefined : saveMeta.className}
          />
        }
        label="Save"
        aria-label={`Save — ${saveMeta.title}`}
        tooltip={saveState === "error" ? (saveErrorMessage || saveMeta.title) : saveMeta.title}
        shortcut={formatShortcut("S")}
        disabled={!hasFiles || saveState === "saving"}
        onClick={onSave}
      />
      {showClose && (
        <PaneToolbarButton
          icon={<HiOutlineXCircle size={PANE_ICON_SIZE} />}
          label="Close Pane"
          tooltipPosition="bottom-end"
          onClick={() => onClosePane()}
        />
      )}
    </div>
  );
}
