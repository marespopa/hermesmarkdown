"use client";

import React, { createContext, useContext } from "react";
import type { ToolbarDisplayMode } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import Tooltip from "@/app/components/Tooltip";
import { PANE_ACTION_ACTIVE_CLASS, PANE_ACTION_BUTTON_CLASS, PANE_ACTION_LABEL_CLASS } from "./pane-header-classes";

// The display mode a pane header actually renders: the user's toolbar style,
// unless the pane is too narrow for labels. `PaneLeaf` provides it.
export const ToolbarModeContext = createContext<ToolbarDisplayMode>("icon");
export const useToolbarMode = () => useContext(ToolbarModeContext);

type TooltipPosition = "bottom" | "bottom-start" | "bottom-end";

interface PaneToolbarButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  icon: React.ReactNode;
  /** Visible under the icon in "Icon and Text"; the tooltip otherwise. */
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  shortcut?: string;
  /** Tooltip text when it differs from the label (e.g. a save error). */
  tooltip?: string;
  tooltipPosition?: TooltipPosition;
  /** Pressed / open look. */
  active?: boolean;
}

// One toolbar button: an icon, with its label under it in "Icon and Text".
// The tooltip carries the name (and shortcut) in both modes; it's portaled so
// the pane (which clips) can't cut it off.
const PaneToolbarButton = React.forwardRef<HTMLButtonElement, PaneToolbarButtonProps>(function PaneToolbarButton(
  { icon, label, onClick, shortcut, tooltip, tooltipPosition = "bottom", active = false, className = "", ...rest },
  ref,
) {
  const mode = useToolbarMode();
  return (
    <Tooltip label={tooltip ?? label} shortcut={shortcut} position={tooltipPosition} portal>
      <Button
        ref={ref}
        // Unstyled: the toolbar classes own every state (the "icon" variant's
        // hover fill and scale would compete with them).
        variant="unstyled"
        onClick={onClick}
        aria-label={label}
        {...rest}
        className={`${PANE_ACTION_BUTTON_CLASS[mode]} ${active ? PANE_ACTION_ACTIVE_CLASS : ""} ${className}`}
      >
        {icon}
        {mode === "iconAndText" && <span aria-hidden="true" className={PANE_ACTION_LABEL_CLASS}>{label}</span>}
      </Button>
    </Tooltip>
  );
});

export default PaneToolbarButton;
