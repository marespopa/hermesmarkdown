"use client";

import React from "react";
import { useAtom } from "jotai";
import { HiOutlineArrowsExpand } from "react-icons/hi";
import { atom_pageOnly } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import Tooltip from "@/app/components/Tooltip";
import { formatShortcut } from "@/app/utils/platform";
import { PILL_BUTTON_CLASS } from "./pane-header-classes";

// Turns No Distraction Mode on or off (atom_pageOnly, as Ctrl/Cmd+Alt+Z and the
// palette): before the search pill in the editor's top-right corner
// (EditorShell), in the pill's look, pressed while the mode is on. The row
// rests invisible: hovering it or the top edge, or a tap on the edge
// (PageOnlyPeek), brings it back, in the mode too, where this button leaves it.
export default function PageOnlyToggleButton({ className = "" }: { className?: string }) {
  const [pageOnly, setPageOnly] = useAtom(atom_pageOnly);

  return (
    <Tooltip label={pageOnly ? "Leave No Distraction Mode" : "No Distraction Mode"} shortcut={formatShortcut("Z", { alt: true })} position="bottom" portal>
      <Button
        variant="unstyled"
        onClick={() => setPageOnly(!pageOnly)}
        aria-label="No distraction mode"
        aria-pressed={pageOnly}
        className={`${PILL_BUTTON_CLASS} ${pageOnly ? "!bg-black/[0.1] !text-fg dark:!bg-white/[0.14]" : ""} ${className}`}
      >
        <HiOutlineArrowsExpand size={14} aria-hidden="true" />
      </Button>
    </Tooltip>
  );
}
