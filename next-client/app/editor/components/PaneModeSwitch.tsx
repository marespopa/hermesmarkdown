"use client";

import React from "react";
import { useAtom } from "jotai";
import { HiOutlineBookOpen, HiOutlinePencil } from "react-icons/hi";
import { atom_viewMode, type ViewMode } from "@/app/atoms/ui-atoms";
import ModeSwitch, { type ModeSwitchOption } from "@/app/components/ModeSwitch";
import Tooltip from "@/app/components/Tooltip";
import { formatShortcut } from "@/app/utils/platform";

const OPTIONS: readonly ModeSwitchOption<ViewMode>[] = [
  { value: "edit", label: "Edit", Icon: HiOutlinePencil },
  { value: "preview", label: "Preview", Icon: HiOutlineBookOpen },
];

interface PaneModeSwitchProps {
  iconOnly?: boolean;
  /** Show the hover tooltip (desktop only — touch has no hover). */
  withTooltip?: boolean;
  className?: string;
}

// Edit | Preview switch. The mode is app-wide (atom_viewMode), so every pane
// and tab shows the same one.
export default function PaneModeSwitch({ iconOnly = false, withTooltip = true, className }: PaneModeSwitchProps) {
  const [mode, setMode] = useAtom(atom_viewMode);
  const control = (
    <ModeSwitch
      options={OPTIONS}
      value={mode}
      onChange={setMode}
      label="Editor mode"
      iconOnly={iconOnly}
      className={className}
    />
  );
  if (!withTooltip) return control;
  return (
    <Tooltip label={mode === "preview" ? "Back to editing" : "Open in preview"} shortcut={formatShortcut("P", { alt: true })}>
      {control}
    </Tooltip>
  );
}
