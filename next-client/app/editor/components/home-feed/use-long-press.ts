"use client";

import { useCallback, useEffect, useRef } from "react";
import type React from "react";

export const LONG_PRESS_MS = 500;
// A finger that drifts further than this is scrolling, not pressing.
const MOVE_TOLERANCE_PX = 10;

// Touch-and-hold on an element: calls `onLongPress` with the touch point
// after LONG_PRESS_MS, unless the finger lifts or moves first. iOS Safari
// fires no contextmenu event on a long press, hence the timer. The click
// the browser may send after the hold is swallowed (`shouldSkipClick`), so
// the hold doesn't also open what was pressed.
export function useLongPress(onLongPress: (point: { x: number; y: number }) => void) {
  const timer = useRef<number | null>(null);
  const start = useRef({ x: 0, y: 0 });
  const didFire = useRef(false);
  const latest = useRef(onLongPress);
  latest.current = onLongPress;

  const cancel = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  const onTouchStart = useCallback((event: React.TouchEvent) => {
    cancel();
    didFire.current = false;
    const touch = event.touches[0];
    if (!touch || event.touches.length > 1) return;
    start.current = { x: touch.clientX, y: touch.clientY };
    timer.current = window.setTimeout(() => {
      timer.current = null;
      didFire.current = true;
      navigator.vibrate?.(10);
      latest.current(start.current);
    }, LONG_PRESS_MS);
  }, [cancel]);

  const onTouchMove = useCallback((event: React.TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;
    const dx = touch.clientX - start.current.x;
    const dy = touch.clientY - start.current.y;
    if (dx * dx + dy * dy > MOVE_TOLERANCE_PX * MOVE_TOLERANCE_PX) cancel();
  }, [cancel]);

  // True once per hold: the click that follows it should be ignored.
  const shouldSkipClick = useCallback(() => {
    const skip = didFire.current;
    didFire.current = false;
    return skip;
  }, []);

  return {
    handlers: { onTouchStart, onTouchMove, onTouchEnd: cancel, onTouchCancel: cancel },
    shouldSkipClick,
    /** Whether a hold just opened something (its contextmenu event is a duplicate). */
    didFire: () => didFire.current,
  };
}
