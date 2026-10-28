"use client";

import { useCallback, useEffect, useRef } from "react";

// How close to a screen edge a touch must start, and how far it must travel
// sideways, to count as an edge swipe.
export const EDGE_ZONE_PX = 20;
export const SWIPE_PX = 60;

export type Edge = "left" | "right";

export function edgeOf(x: number, width: number): Edge | null {
  if (x <= EDGE_ZONE_PX) return "left";
  if (x >= width - EDGE_ZONE_PX) return "right";
  return null;
}

// "right" / "left" once the finger has gone far enough, more sideways than
// up or down (a vertical scroll never counts); null until then.
export function classifySwipe(dx: number, dy: number): "left" | "right" | null {
  if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) <= Math.abs(dy)) return null;
  return dx > 0 ? "right" : "left";
}

// The on-screen keyboard is up while a field has focus, and a selection drag
// is under way once the selection isn't collapsed: a swipe then belongs to
// the text.
function isTyping(): boolean {
  const active = document.activeElement;
  const editing = active instanceof HTMLElement && (active.isContentEditable || /^(INPUT|TEXTAREA)$/.test(active.tagName));
  return editing || window.getSelection()?.isCollapsed === false;
}

interface EdgeSwipeOptions {
  enabled: boolean;
  onLeftEdge: () => void;
  onRightEdge: () => void;
}

// Opens the navigation drawer on a right swipe from the left edge, and the
// outline drawer on a left swipe from the right edge.
export function useEdgeSwipe({ enabled, onLeftEdge, onRightEdge }: EdgeSwipeOptions) {
  const latest = useRef({ onLeftEdge, onRightEdge });
  latest.current = { onLeftEdge, onRightEdge };

  useEffect(() => {
    if (!enabled) return;
    let start: { x: number; y: number; edge: Edge } | null = null;

    const onStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      const edge = event.touches.length === 1 && touch ? edgeOf(touch.clientX, window.innerWidth) : null;
      start = edge && !isTyping() ? { x: touch.clientX, y: touch.clientY, edge } : null;
    };
    const onMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!start || !touch) return;
      const swipe = classifySwipe(touch.clientX - start.x, touch.clientY - start.y);
      if (!swipe) return;
      const { edge } = start;
      start = null;
      if (edge === "left" && swipe === "right") latest.current.onLeftEdge();
      else if (edge === "right" && swipe === "left") latest.current.onRightEdge();
    };
    const onEnd = () => {
      start = null;
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, [enabled]);
}

// Touch handlers for an open drawer's panel: a swipe toward its edge closes it.
export function useSwipeToClose(toward: Edge, onClose: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = useCallback((event: React.TouchEvent) => {
    const touch = event.touches[0];
    start.current = event.touches.length === 1 && touch ? { x: touch.clientX, y: touch.clientY } : null;
  }, []);
  const onTouchMove = useCallback((event: React.TouchEvent) => {
    const touch = event.touches[0];
    if (!start.current || !touch) return;
    if (classifySwipe(touch.clientX - start.current.x, touch.clientY - start.current.y) === toward) {
      start.current = null;
      onClose();
    }
  }, [toward, onClose]);
  return { onTouchStart, onTouchMove };
}
