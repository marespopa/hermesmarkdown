"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { HiOutlineChatAlt2 } from "react-icons/hi";
import Portal from "../../components/Portal";
import { useAtomValue } from "jotai";
import { atom_isAiBusy } from "@/app/atoms/atoms";

const STORAGE_KEY = "hermes_fab_pos";
const FAB_SIZE = 52;
const EDGE_PAD = 16;
const DRAG_THRESHOLD = 6;

interface AssistantFabProps {
  onClick: () => void;
}

export default function AssistantFab({ onClick }: AssistantFabProps) {
  const isAiBusy = useAtomValue(atom_isAiBusy);

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
    setPos(loadPos() ?? defaultPos());
  }, []);

  // Clamp to viewport on resize
  useEffect(() => {
    const clamp = () => {
      setPos((prev) => {
        if (!prev) return prev;
        return {
          x: Math.min(prev.x, window.innerWidth - FAB_SIZE - EDGE_PAD),
          y: Math.min(prev.y, window.innerHeight - FAB_SIZE - EDGE_PAD),
        };
      });
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
        onClick();
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
  }, [pos, onClick, savePos]);

  // Touch: just tap to open (no drag on touch — too finicky)
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    onClick();
  }, [onClick]);

  if (!pos) return null;

  return (
    <Portal>
      <button
        type="button"
        aria-label="Open AI Chat"
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
        <HiOutlineChatAlt2 size={22} />
        {isAiBusy && (
          <span className="absolute inset-0 rounded-full border-2 border-white/50 animate-ping" />
        )}
      </button>
    </Portal>
  );
}
