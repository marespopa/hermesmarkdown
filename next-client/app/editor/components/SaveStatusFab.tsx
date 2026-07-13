"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import {
  atom_workspaceLayout,
  atom_activePaneId,
  atom_openFiles,
  atom_saveStatus,
  atom_sidebarWidth,
  atom_railPanel,
  findLeaf,
} from "@/app/atoms/atoms";
import { BsFloppyFill } from "react-icons/bs";
import { HiOutlineChevronLeft } from "react-icons/hi";
import { TabSaveState, statusMeta } from "./PaneTab";

interface SaveStatusFabProps {
  onSave: () => void;
}

// Fixed bottom-left save-status indicator for desktop — the in-content
// frontmatter summary bar scrolls away with the editor, so this is the one
// place save state stays visible regardless of scroll position. Spells the
// state out (icon + label) rather than a bare dot, which wasn't legible on
// its own. Lives in the opposite corner from FabBar (bottom-right) by
// default, but is freely draggable (position persisted, same pattern as
// FabBar) so it never has to fight the sidebar or other chrome for space.
// Collapsible to a bare status dot for people who just want the color, not
// the label. A dedicated save button is attached alongside the readout —
// same action as Cmd+S, for people who'd rather click.
const POS_STORAGE_KEY = "hermes_save_fab_pos";
const COLLAPSED_STORAGE_KEY = "hermes_save_fab_collapsed";
const EDGE_PAD = 16;
const PILL_HEIGHT = 30;
const DRAG_THRESHOLD = 6;

export default function SaveStatusFab({ onSave }: SaveStatusFabProps) {
  const workspaceLayout = useAtomValue(atom_workspaceLayout);
  const activePaneId = useAtomValue(atom_activePaneId);
  const openFiles = useAtomValue(atom_openFiles);
  const saveStatus = useAtomValue(atom_saveStatus);
  const railPanel = useAtomValue(atom_railPanel);
  const sidebarWidth = useAtomValue(atom_sidebarWidth);

  const containerRef = useRef<HTMLDivElement>(null);
  const sidebarOffset = railPanel !== null ? sidebarWidth : 0;

  // null means "no custom position yet" — falls back to the sidebar-aware
  // default below. Once the user drags it, the saved position wins and no
  // longer reacts to the sidebar opening/closing.
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null);
  const [hasCustomPos, setHasCustomPos] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const dragState = useRef<{
    startMouseX: number;
    startMouseY: number;
    startLeft: number;
    startBottom: number;
    moved: boolean;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(POS_STORAGE_KEY);
      if (raw) {
        setPos(JSON.parse(raw));
        setHasCustomPos(true);
      }
      setCollapsed(localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1");
    } catch {}
  }, []);

  // Clamp a dragged-to position back on-screen if the window shrinks.
  useEffect(() => {
    if (!hasCustomPos) return;
    const clamp = () => {
      const width = containerRef.current?.offsetWidth ?? PILL_HEIGHT;
      const height = containerRef.current?.offsetHeight ?? PILL_HEIGHT;
      setPos((prev) => {
        if (!prev) return prev;
        return {
          left: Math.min(Math.max(prev.left, EDGE_PAD), window.innerWidth - width - EDGE_PAD),
          bottom: Math.min(Math.max(prev.bottom, EDGE_PAD), window.innerHeight - height - EDGE_PAD),
        };
      });
    };
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, [hasCustomPos]);

  const savePos = useCallback((p: { left: number; bottom: number }) => {
    try { localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(p)); } catch {}
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? "1" : "0"); } catch {}
      return next;
    });
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const startLeft = rect.left;
    const startBottom = window.innerHeight - rect.bottom;
    dragState.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startLeft,
      startBottom,
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
      const width = containerRef.current?.offsetWidth ?? PILL_HEIGHT;
      const height = containerRef.current?.offsetHeight ?? PILL_HEIGHT;
      const nx = Math.max(EDGE_PAD, Math.min(window.innerWidth - width - EDGE_PAD, ds.startLeft + dx));
      const ny = Math.max(EDGE_PAD, Math.min(window.innerHeight - height - EDGE_PAD, ds.startBottom - dy));
      setPos({ left: nx, bottom: ny });
      setHasCustomPos(true);
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setIsDragging(false);
      const ds = dragState.current;
      if (ds?.moved) {
        setPos((current) => {
          if (current) savePos(current);
          return current;
        });
      }
      dragState.current = null;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [savePos]);

  const leaf = activePaneId ? findLeaf(workspaceLayout.rootContainer, activePaneId) : null;
  const filePath = leaf?.activeFilePath;
  if (!filePath) return null;

  const fileState = openFiles[filePath];
  const isDirty = !!fileState && fileState.content !== fileState.lastSavedContent;
  const saveState: TabSaveState =
    saveStatus.path === filePath && saveStatus.state === "error"
      ? "error"
      : saveStatus.path === filePath && saveStatus.state === "saving"
      ? "saving"
      : saveStatus.path === filePath && saveStatus.state === "saved"
      ? "saved"
      : isDirty
      ? "dirty"
      : "idle";
  const meta = statusMeta[saveState];

  const style: React.CSSProperties = hasCustomPos && pos
    ? { left: pos.left, bottom: pos.bottom, height: PILL_HEIGHT }
    : { left: EDGE_PAD + sidebarOffset, bottom: EDGE_PAD, height: PILL_HEIGHT };

  return (
    <div
      ref={containerRef}
      onMouseDown={onMouseDown}
      className={`fixed z-[80] flex items-center rounded-full shadow-lg bg-chrome border border-edge-subtle select-none overflow-hidden cursor-grab ${
        isDragging ? "cursor-grabbing shadow-xl" : ""
      } ${hasCustomPos ? "" : "transition-[left] duration-300 ease-in-out"}`}
      style={style}
    >
      {collapsed ? (
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={`${meta.title} — show save status`}
          title={`${meta.title} — click to expand`}
          className="flex items-center justify-center"
          style={{ width: PILL_HEIGHT, height: PILL_HEIGHT }}
        >
          {saveState === "saving" ? (
            <span className="w-3 h-3 rounded-full border-2 border-edge border-t-sage animate-spin shrink-0" />
          ) : (
            meta.Icon && <meta.Icon size={13} className={`shrink-0 ${meta.className}`} />
          )}
        </button>
      ) : (
        <>
          <span
            className="flex items-center gap-1.5 h-full pl-2.5 pr-2"
            title={saveState === "error" ? saveStatus.message || meta.title : meta.title}
          >
            {saveState === "saving" ? (
              <span className="w-3 h-3 rounded-full border-2 border-edge border-t-sage animate-spin shrink-0" />
            ) : (
              meta.Icon && <meta.Icon size={13} className={`shrink-0 ${meta.className}`} />
            )}
            <span className={`text-[11px] font-medium leading-none whitespace-nowrap ${meta.className}`}>
              {meta.label}
            </span>
          </span>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Collapse save status"
            title="Collapse"
            className="flex items-center justify-center h-full px-1.5 border-l border-edge-subtle text-fg-faint hover:text-sage hover:bg-sage/10 transition-colors"
          >
            <HiOutlineChevronLeft size={11} />
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saveState === "saving"}
            aria-label="Save now"
            title="Save now"
            className="flex items-center justify-center h-full pl-1.5 pr-2.5 border-l border-edge-subtle text-fg-faint hover:text-sage hover:bg-sage/10 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <BsFloppyFill size={13} />
          </button>
        </>
      )}
    </div>
  );
}
