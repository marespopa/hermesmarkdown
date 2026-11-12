"use client";

import React from "react";
import { useAtom } from "jotai";
import { HiOutlineArrowsExpand } from "react-icons/hi";
import { atom_pageOnly } from "@/app/atoms/ui-atoms";
import { formatShortcut } from "@/app/utils/platform";
import CornerButton from "./CornerButton";

// Turns No Distraction Mode on or off (atom_pageOnly, as Ctrl/Cmd+Alt+Z and the
// palette): before the search pill in the editor's top-right corner
// (EditorShell), in the pill's look, pressed while the mode is on. The row
// rests invisible: hovering it or the top edge, or a tap on the edge
// (PageOnlyPeek), brings it back, in the mode too, where this button leaves it.
export default function PageOnlyToggleButton({ className = "" }: { className?: string }) {
  const [pageOnly, setPageOnly] = useAtom(atom_pageOnly);

  return (
    <CornerButton
      icon={<HiOutlineArrowsExpand size={14} aria-hidden="true" />}
      label="No distraction mode"
      tooltip={pageOnly ? "Leave No Distraction Mode" : "No Distraction Mode"}
      shortcut={formatShortcut("Z", { alt: true })}
      onClick={() => setPageOnly(!pageOnly)}
      aria-pressed={pageOnly}
      className={`${pageOnly ? "!bg-black/[0.1] !text-fg dark:!bg-white/[0.14]" : ""} ${className}`}
    />
  );
}
