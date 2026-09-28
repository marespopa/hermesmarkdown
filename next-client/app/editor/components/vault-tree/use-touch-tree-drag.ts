"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { canDropInto, type DraggedEntry } from "./tree-model";

const LONG_PRESS_MS = 350;
// Finger travel that turns a pending press into a scroll instead.
const MOVE_SLOP_PX = 10;
const AUTO_EXPAND_MS = 500;
const EDGE_SCROLL_PX = 48;
const EDGE_SCROLL_STEP = 8;

interface UseTouchTreeDragOptions {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  setDraggedEntry: (entry: DraggedEntry | null) => void;
  onDropInto: (targetPath: string, entry: DraggedEntry) => void;
  expandFolder: (path: string) => void;
}

// Touch drag for the file tree: native HTML drag and drop doesn't work
// reliably on touch screens. Long-press a row to pick it up, drag it over a
// folder (or a file inside one, or empty space for the vault root) and lift
// to move it there. A quick swipe still scrolls the list.
//
// Drop targets are found by hit-testing `data-drop-folder` (the folder path
// a row stands for); anywhere else inside the list means the vault root.
export function useTouchTreeDrag({ scrollRef, setDraggedEntry, onDropInto, expandFolder }: UseTouchTreeDragOptions) {
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ name: string; x: number; y: number } | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const latest = useRef({ setDraggedEntry, onDropInto, expandFolder });
  latest.current = { setDraggedEntry, onDropInto, expandFolder };

  useEffect(() => () => cleanupRef.current?.(), []);

  const startTouchDrag = useCallback((e: React.TouchEvent, entry: DraggedEntry) => {
    if (e.touches.length !== 1) return;
    cleanupRef.current?.();

    const start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    let point = start;
    let active = false;
    let target: string | null = null;
    let expandTimer: ReturnType<typeof setTimeout> | null = null;
    let scrollFrame = 0;

    const setTarget = (next: string | null) => {
      if (next === target) return;
      target = next;
      setDropTarget(next);
      if (expandTimer) clearTimeout(expandTimer);
      expandTimer = next ? setTimeout(() => latest.current.expandFolder(next), AUTO_EXPAND_MS) : null;
    };

    const hitTest = () => {
      const container = scrollRef.current;
      const el = document.elementFromPoint(point.x, point.y);
      if (!container || !el || !container.contains(el)) return null;
      const path = el.closest<HTMLElement>("[data-drop-folder]")?.dataset.dropFolder ?? "";
      return canDropInto(entry, path) ? path : null;
    };

    // Scrolls the list while the finger rests near its top or bottom edge.
    const edgeScroll = () => {
      const container = scrollRef.current;
      if (!active || !container) return;
      const rect = container.getBoundingClientRect();
      const delta =
        point.y < rect.top + EDGE_SCROLL_PX ? -EDGE_SCROLL_STEP :
        point.y > rect.bottom - EDGE_SCROLL_PX ? EDGE_SCROLL_STEP : 0;
      if (delta) {
        container.scrollTop += delta;
        setTarget(hitTest());
      }
      scrollFrame = requestAnimationFrame(edgeScroll);
    };

    const pressTimer = setTimeout(() => {
      active = true;
      latest.current.setDraggedEntry(entry);
      setGhost({ name: entry.name, ...point });
      navigator.vibrate?.(10);
      scrollFrame = requestAnimationFrame(edgeScroll);
    }, LONG_PRESS_MS);

    const onMove = (ev: TouchEvent) => {
      const touch = ev.touches[0];
      if (!touch) return;
      point = { x: touch.clientX, y: touch.clientY };
      if (!active) {
        if (Math.hypot(point.x - start.x, point.y - start.y) > MOVE_SLOP_PX) cleanup();
        return;
      }
      // Holds the list still while dragging.
      if (ev.cancelable) ev.preventDefault();
      setGhost({ name: entry.name, ...point });
      setTarget(hitTest());
    };

    const onEnd = (ev: TouchEvent) => {
      if (active) {
        // Keeps the lift from also clicking the row underneath.
        if (ev.cancelable) ev.preventDefault();
        const path = hitTest();
        if (ev.type === "touchend" && path !== null) latest.current.onDropInto(path, entry);
      }
      cleanup();
    };

    // Android opens a context menu (or text selection) on long press.
    const onContextMenu = (ev: Event) => ev.preventDefault();

    function cleanup() {
      clearTimeout(pressTimer);
      if (expandTimer) clearTimeout(expandTimer);
      cancelAnimationFrame(scrollFrame);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
      document.removeEventListener("contextmenu", onContextMenu);
      if (active) {
        latest.current.setDraggedEntry(null);
        setGhost(null);
        setDropTarget(null);
      }
      active = false;
      cleanupRef.current = null;
    }

    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd, { passive: false });
    document.addEventListener("touchcancel", onEnd);
    document.addEventListener("contextmenu", onContextMenu);
    cleanupRef.current = cleanup;
  }, [scrollRef]);

  // True from touchstart until the touch ends: a native dragstart then (the
  // browser's own long-press drag) is cancelled, since it would cancel ours.
  const isTouchPressing = useCallback(() => cleanupRef.current !== null, []);

  return { startTouchDrag, touchDropTarget: dropTarget, touchGhost: ghost, isTouchPressing };
}
