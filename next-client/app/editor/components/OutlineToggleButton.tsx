"use client";

import React from "react";
import { useAtom } from "jotai";
import { HiOutlineMenuAlt2 } from "react-icons/hi";
import { atom_showOutline } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import Tooltip from "@/app/components/Tooltip";
import { formatShortcut } from "@/app/utils/platform";
import { PILL_BUTTON_CLASS } from "./pane-header-classes";

// Shows or hides the note's outline (atom_showOutline, as Ctrl/Cmd+Shift+M
// and the outline's own ×): left of Copy Contents in the editor's top-right
// corner (EditorShell), in the pill's look, pressed while the outline is on.
export default function OutlineToggleButton({ className = "" }: { className?: string }) {
  const [showOutline, setShowOutline] = useAtom(atom_showOutline);

  return (
    <Tooltip label={showOutline ? "Hide Outline" : "Show Outline"} shortcut={formatShortcut("M", { shift: true })} position="bottom" portal>
      <Button
        variant="unstyled"
        onClick={() => setShowOutline(!showOutline)}
        aria-label="Outline"
        aria-pressed={showOutline}
        className={`${PILL_BUTTON_CLASS} ${showOutline ? "!bg-black/[0.1] !text-fg dark:!bg-white/[0.14]" : ""} ${className}`}
      >
        <HiOutlineMenuAlt2 size={14} aria-hidden="true" />
      </Button>
    </Tooltip>
  );
}
