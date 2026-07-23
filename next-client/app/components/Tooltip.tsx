"use client";

import React from "react";

type Position = "right" | "top" | "bottom" | "bottom-end";

const POSITION_CLASSES: Record<Position, string> = {
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
  top: "left-1/2 bottom-full -translate-x-1/2 mb-2",
  bottom: "left-1/2 top-full -translate-x-1/2 mt-2",
  // Like "bottom", but grows leftward from the trigger's right edge instead
  // of centering — for triggers that sit near the right edge of a narrow
  // container (e.g. a split pane's action row), where a centered tooltip's
  // right half would overflow past the pane and get clipped/invisible.
  "bottom-end": "right-0 top-full mt-2",
};

/**
 * Shared hover tooltip — the delayed fade-in affordance used across all
 * icon-only controls (sidebar rail, pane tab actions, etc).
 */
export default function Tooltip({
  children,
  label,
  shortcut,
  position = "bottom",
}: {
  children: React.ReactNode;
  label: string;
  shortcut?: string;
  position?: Position;
}) {
  return (
    <span className="relative inline-flex group/tooltip">
      {children}
      <span
        className={`pointer-events-none absolute whitespace-nowrap bg-overlay border border-edge text-fg text-ui-caption px-2 py-1 opacity-0 group-hover/tooltip:opacity-100 transition-opacity [transition-delay:400ms] z-50 ${POSITION_CLASSES[position]}`}
        // Some callers pass theme-dependent labels ("Switch to dark/light
        // theme") that can only resolve correctly after mount when the
        // theme is "system" — see use-resolved-theme.ts. Suppressing here
        // is harmless for every other (theme-independent) caller too.
        suppressHydrationWarning
      >
        {label}
        {shortcut && <span className="opacity-50 ml-1.5">{shortcut}</span>}
      </span>
    </span>
  );
}
