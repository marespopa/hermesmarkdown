"use client";

import React from "react";

type Position = "right" | "top" | "bottom";

const POSITION_CLASSES: Record<Position, string> = {
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
  top: "left-1/2 bottom-full -translate-x-1/2 mb-2",
  bottom: "left-1/2 top-full -translate-x-1/2 mt-2",
};

/**
 * Shared hover tooltip — same delayed fade-in affordance as the IconRail
 * rail buttons (app/editor/components/IconRail.tsx), for any icon-only
 * control elsewhere in the app.
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
        className={`pointer-events-none absolute whitespace-nowrap bg-overlay border border-edge text-fg text-ui-caption px-2 py-1 opacity-0 group-hover/tooltip:opacity-100 transition-opacity delay-[400ms] z-50 ${POSITION_CLASSES[position]}`}
      >
        {label}
        {shortcut && <span className="opacity-50 ml-1.5">{shortcut}</span>}
      </span>
    </span>
  );
}
