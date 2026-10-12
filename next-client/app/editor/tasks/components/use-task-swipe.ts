"use client";

import React from "react";
import type { TaskStatus } from "@/app/utils/task-status";

// Swipe actions on a Tasks page row (touch and pen only; a mouse drags
// nothing). Swiping right moves the task forward: start it, complete it, or
// reopen a closed one. Swiping left sets it aside: on hold, or cancelled
// when it's already on hold. Past THRESHOLD the action arms (a short
// vibration where supported); letting go then runs it, and the row springs
// back either way.

export interface SwipeAction {
  status: TaskStatus;
  label: string;
}

export const SWIPE_THRESHOLD = 80;
// Movement before a touch counts as a swipe rather than a tap or a scroll.
const SLOP = 8;

export function taskSwipeActions(status: TaskStatus): { right: SwipeAction; left?: SwipeAction } {
  switch (status) {
    case "todo":
      return { right: { status: "prog", label: "Start" }, left: { status: "hold", label: "Hold" } };
    case "prog":
      return { right: { status: "done", label: "Complete" }, left: { status: "hold", label: "Hold" } };
    case "hold":
      return { right: { status: "prog", label: "Resume" }, left: { status: "cancelled", label: "Cancel" } };
    default:
      return { right: { status: "todo", label: "Reopen" } };
  }
}

// The row's offset for a finger `raw` px from where it landed: free up to
// the threshold, then rubber-banded; a side without an action barely moves.
export function swipeOffset(raw: number, hasAction: boolean, threshold = SWIPE_THRESHOLD): number {
  if (!hasAction) return raw / 4;
  const over = Math.abs(raw) - threshold;
  return over > 0 ? Math.sign(raw) * (threshold + over / 3) : raw;
}

export function useTaskSwipe(status: TaskStatus, onAction: (status: TaskStatus) => void) {
  const actions = taskSwipeActions(status);
  const [offset, setOffset] = React.useState(0);
  const [armed, setArmed] = React.useState(false);
  const start = React.useRef<{ x: number; y: number } | null>(null);
  const dragging = React.useRef(false);
  const swiped = React.useRef(false);
  const armedRef = React.useRef(false);
  const rightward = React.useRef(true);

  const reset = () => {
    start.current = null;
    dragging.current = false;
    armedRef.current = false;
    setOffset(0);
    setArmed(false);
  };

  const handlers = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse") return;
      start.current = { x: e.clientX, y: e.clientY };
      swiped.current = false;
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      if (!start.current) return;
      const raw = e.clientX - start.current.x;
      if (!dragging.current) {
        if (Math.abs(raw) < SLOP) return;
        // Mostly vertical: a scroll, not a swipe.
        if (Math.abs(e.clientY - start.current.y) > Math.abs(raw)) {
          start.current = null;
          return;
        }
        dragging.current = true;
        swiped.current = true;
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }
      rightward.current = raw > 0;
      const action = raw > 0 ? actions.right : actions.left;
      setOffset(swipeOffset(raw, !!action));
      const nowArmed = !!action && Math.abs(raw) >= SWIPE_THRESHOLD;
      if (nowArmed && !armedRef.current) navigator.vibrate?.(8);
      armedRef.current = nowArmed;
      setArmed(nowArmed);
    },
    onPointerUp: () => {
      if (dragging.current && armedRef.current) {
        const action = rightward.current ? actions.right : actions.left;
        if (action) onAction(action.status);
      }
      reset();
    },
    onPointerCancel: reset,
    // A swipe ends with a click on whatever was under the finger; it
    // mustn't also open the note or tick the box.
    onClickCapture: (e: React.MouseEvent) => {
      if (!swiped.current) return;
      swiped.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
  };

  return {
    offset,
    armed,
    action: offset > 0 ? actions.right : offset < 0 ? actions.left : undefined,
    handlers,
  };
}
