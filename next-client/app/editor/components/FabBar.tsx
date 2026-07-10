"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { HiOutlineSearch } from "react-icons/hi";
import Portal from "../../components/Portal";
import { useAtomValue } from "jotai";
import { atom_isAiBusy } from "@/app/atoms/atoms";
import { useCommandPalette } from "@/app/components/CommandPalette/CommandPaletteContext";

// Draggable floating action button that opens the command palette — every
// other action (including "Open AI Chat") lives in the palette itself, see
// EditorCommands.tsx. Still pulses while the AI is busy, so it doubles as a
// live-status indicator. Position/drag mechanics carried over unchanged from
// the retired AssistantFab (same localStorage key, so existing saved
// positions still apply).
const STORAGE_KEY = "hermes_fab_pos";
const FAB_SIZE = 52;
const EDGE_PAD = 16;
const DRAG_THRESHOLD = 6;

export default function FabBar() {
  const isAiBusy = useAtomValue(atom_isAiBusy);
  const { open: handleTap } = useCommandPalette();

  const loadPos = (): { x: number; y: number } | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  };

  const defaultPos = () => ({
    x: window.innerWidth - FAB_SIZE - EDGE_PAD,
    y: window.innerHeight - FAB_SIZE - EDGE_PAD,
  });

  // A position saved from a different viewport (e.g. a narrower window, or
  // mobile) can otherwise land the FAB off-screen on this one.
  const clampToViewport = (p: { x: number; y: number }) => ({
    x: Math.min(Math.max(p.x, EDGE_PAD), window.innerWidth - FAB_SIZE - EDGE_PAD),
    y: Math.min(Math.max(p.y, EDGE_PAD), window.innerHeight - FAB_SIZE - EDGE_PAD),
  });

  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragState = useRef<{
    startMouseX: number;
    startMouseY: number;
    startFabX: number;
    startFabY: number;
    moved: boolean;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Hydrate position after mount (avoids SSR mismatch)
  useEffect(() => {
    const loaded = loadPos();
    setPos(loaded ? clampToViewport(loaded) : defaultPos());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clamp to viewport on resize
  useEffect(() => {
    const clamp = () => {
      setPos((prev) => (prev ? clampToViewport(prev) : prev));
    };
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, []);

  const savePos = useCallback((p: { x: number; y: number }) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const current = pos ?? defaultPos();
    dragState.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startFabX: current.x,
      startFabY: current.y,
      moved: false,
    };

    const onMove = (ev: MouseEvent) => {
      const ds = dragState.current;
      if (!ds) return;
      const dx = ev.clientX - ds.startMouseX;
      const dy = ev.clientY - ds.startMouseY;
      if (!ds.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      ds.moved = true;
      setIsDragging(true);
      const nx = Math.max(EDGE_PAD, Math.min(window.innerWidth - FAB_SIZE - EDGE_PAD, ds.startFabX + dx));
      const ny = Math.max(EDGE_PAD, Math.min(window.innerHeight - FAB_SIZE - EDGE_PAD, ds.startFabY + dy));
      setPos({ x: nx, y: ny });
    };

    const onUp = (ev: MouseEvent) => {
      const ds = dragState.current;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setIsDragging(false);
      if (!ds?.moved) {
        handleTap();
      } else {
        const nx = Math.max(EDGE_PAD, Math.min(window.innerWidth - FAB_SIZE - EDGE_PAD, ds.startFabX + (ev.clientX - ds.startMouseX)));
        const ny = Math.max(EDGE_PAD, Math.min(window.innerHeight - FAB_SIZE - EDGE_PAD, ds.startFabY + (ev.clientY - ds.startMouseY)));
        const finalPos = { x: nx, y: ny };
        setPos(finalPos);
        savePos(finalPos);
      }
      dragState.current = null;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [pos, handleTap, savePos]);

  // Touch: just tap to open (no drag on touch — too finicky)
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handleTap();
  }, [handleTap]);

  if (!pos) return null;

  return (
    <Portal>
      <button
        type="button"
        aria-label="Open command palette"
        onMouseDown={onMouseDown}
        onTouchEnd={onTouchEnd}
        className={`fixed z-[90] flex items-center justify-center rounded-full shadow-lg transition-shadow select-none
          bg-sage hover:bg-sage/90 active:scale-95 text-white
          ${isDragging ? "cursor-grabbing shadow-xl scale-105" : "cursor-pointer hover:shadow-xl"}
          ${isAiBusy ? "animate-pulse" : ""}
        `}
        style={{
          left: pos.x,
          top: pos.y,
          width: FAB_SIZE,
          height: FAB_SIZE,
          touchAction: "none",
        }}
      >
        <HiOutlineSearch size={22} />
        {isAiBusy && (
          <span className="absolute inset-0 rounded-full border-2 border-white/50 animate-ping" />
        )}
      </button>
    </Portal>
  );
}
