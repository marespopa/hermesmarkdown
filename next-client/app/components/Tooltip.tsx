"use client";

import React, { useEffect, useRef, useState } from "react";
import Portal from "@/app/components/Portal/Portal";

type Position = "right" | "top" | "bottom" | "bottom-start" | "bottom-end";

const POSITION_CLASSES: Record<Position, string> = {
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
  top: "left-1/2 bottom-full -translate-x-1/2 mb-2",
  bottom: "left-1/2 top-full -translate-x-1/2 mt-2",
  // Like "bottom", but grows leftward from the trigger's right edge instead
  // of centering — for triggers that sit near the right edge of a narrow
  // container (e.g. a split pane's action row), where a centered tooltip's
  // right half would overflow past the pane and get clipped/invisible.
  "bottom-end": "right-0 top-full mt-2",
  // Mirror of "bottom-end" for triggers at a left edge (e.g. the toolbar's
  // Sidebar button): grows rightward from the trigger's left edge.
  "bottom-start": "left-0 top-full mt-2",
};

const BUBBLE_CLASSES =
  "pointer-events-none whitespace-nowrap bg-overlay border border-edge text-fg text-ui-caption px-2 py-1 z-50";

const SHOW_DELAY_MS = 400;
const GAP_PX = 8;

// Fixed-position coordinates for the portaled bubble, mirroring POSITION_CLASSES.
function portalStyle(rect: DOMRect, position: Position): React.CSSProperties {
  switch (position) {
    case "right":
      return { left: rect.right + GAP_PX, top: rect.top + rect.height / 2, transform: "translateY(-50%)" };
    case "top":
      return { left: rect.left + rect.width / 2, top: rect.top - GAP_PX, transform: "translate(-50%, -100%)" };
    case "bottom-end":
      return { right: window.innerWidth - rect.right, top: rect.bottom + GAP_PX };
    case "bottom-start":
      return { left: rect.left, top: rect.bottom + GAP_PX };
    case "bottom":
    default:
      return { left: rect.left + rect.width / 2, top: rect.bottom + GAP_PX, transform: "translateX(-50%)" };
  }
}

/**
 * Shared hover tooltip — the delayed fade-in affordance used across all
 * icon-only controls (pane tab actions, toolbar buttons, etc).
 *
 * `portal` renders the bubble into document.body with fixed positioning, for
 * triggers inside a clipping container (e.g. the scrollable tab strip, whose
 * overflow-x forces overflow-y clipping too).
 */
export default function Tooltip({
  children,
  label,
  shortcut,
  position = "bottom",
  portal = false,
}: {
  children: React.ReactNode;
  label: string;
  shortcut?: string;
  position?: Position;
  portal?: boolean;
}) {
  const content = (
    <>
      {label}
      {shortcut && <span className="opacity-50 ml-1.5">{shortcut}</span>}
    </>
  );

  if (portal) {
    return <PortalTooltip position={position} content={content}>{children}</PortalTooltip>;
  }

  return (
    <span className="relative inline-flex group/tooltip">
      {children}
      <span
        className={`${BUBBLE_CLASSES} absolute opacity-0 group-hover/tooltip:opacity-100 transition-opacity [transition-delay:400ms] ${POSITION_CLASSES[position]}`}
        // Some callers pass theme-dependent labels ("Switch to dark/light
        // theme") that can only resolve correctly after mount when the
        // theme is "system" — see use-resolved-theme.ts. Suppressing here
        // is harmless for every other (theme-independent) caller too.
        suppressHydrationWarning
      >
        {content}
      </span>
    </span>
  );
}

function PortalTooltip({
  children,
  content,
  position,
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  position: Position;
}) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const clear = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const show = () => {
    clear();
    timerRef.current = setTimeout(() => {
      if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
    }, SHOW_DELAY_MS);
  };

  const hide = () => {
    clear();
    setRect(null);
  };

  useEffect(() => clear, []);

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onMouseDown={hide}
    >
      {children}
      {rect && (
        <Portal>
          <span role="tooltip" className={`${BUBBLE_CLASSES} fixed`} style={portalStyle(rect, position)}>
            {content}
          </span>
        </Portal>
      )}
    </span>
  );
}
