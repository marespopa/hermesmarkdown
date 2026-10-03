"use client";

import React from "react";
import Button from "@/app/components/Button";
import Tooltip from "@/app/components/Tooltip";
import { PANE_ACTION_ACTIVE_CLASS, PANE_ACTION_BUTTON_CLASS } from "./pane-header-classes";

type TooltipPosition = "bottom" | "bottom-start" | "bottom-end";

interface PaneToolbarButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  icon: React.ReactNode;
  /** Accessible name, and the tooltip unless `tooltip` is set. */
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  shortcut?: string;
  /** Tooltip text when it differs from the label (e.g. a save error). */
  tooltip?: string;
  tooltipPosition?: TooltipPosition;
  /** Pressed / open look. */
  active?: boolean;
}

// One toolbar button: an icon. The tooltip carries the name (and shortcut);
// it's portaled so the pane (which clips) can't cut it off.
const PaneToolbarButton = React.forwardRef<HTMLButtonElement, PaneToolbarButtonProps>(function PaneToolbarButton(
  { icon, label, onClick, shortcut, tooltip, tooltipPosition = "bottom", active = false, className = "", ...rest },
  ref,
) {
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
        className={`${PANE_ACTION_BUTTON_CLASS} ${active ? PANE_ACTION_ACTIVE_CLASS : ""} ${className}`}
      >
        {icon}
      </Button>
    </Tooltip>
  );
});

export default PaneToolbarButton;
